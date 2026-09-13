import Foundation

struct ChoreAPIClient {
    private let baseURL: URL
    private let token: String
    private let session: URLSession

    init(bundle: Bundle = .main, session: URLSession = .shared) throws {
        guard let configURL = bundle.url(forResource: "APIConfig", withExtension: "plist"),
              let config = NSDictionary(contentsOf: configURL),
              let baseURLString = config["BaseURL"] as? String,
              let baseURL = URL(string: baseURLString),
              let token = config["Token"] as? String,
              !token.isEmpty else {
            throw ChoreAPIError.configurationMissing
        }
        self.baseURL = baseURL
        self.token = token
        self.session = session
    }

    func fetchSnapshot(householdId: String) async throws -> ChoreSnapshot {
        try await request(path: "", method: "GET", body: nil, query: ["householdId": householdId])
    }

    func login(phone: String) async throws -> ChoreIdentity {
        try await request(path: "login", method: "POST", body: ["phone": phone])
    }

    func update(reminderId: String, status: ChoreStatus, householdId: String, userId: String) async throws -> ChoreSnapshot {
        guard status == .completed || status == .skipped else {
            throw ChoreAPIError.invalidStatus
        }
        return try await request(path: "outcome", method: "POST", body: [
            "reminderId": reminderId,
            "status": status.rawValue,
            "householdId": householdId,
            "userId": userId,
        ])
    }

    private func request<Response: Decodable>(path: String, method: String, body: [String: String]?, query: [String: String] = [:]) async throws -> Response {
        let endpoint = path.isEmpty ? baseURL : baseURL.appending(path: path)
        guard var components = URLComponents(url: endpoint, resolvingAgainstBaseURL: false) else {
            throw ChoreAPIError.invalidResponse
        }
        components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        guard let url = components.url else { throw ChoreAPIError.invalidResponse }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ChoreAPIError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            let message = (try? JSONDecoder().decode(APIErrorResponse.self, from: data).error)
                ?? "Request failed (\(httpResponse.statusCode))."
            throw ChoreAPIError.server(message)
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }
}

private struct APIErrorResponse: Decodable {
    let error: String
}

enum ChoreAPIError: LocalizedError {
    case configurationMissing
    case invalidResponse
    case invalidStatus
    case server(String)

    var errorDescription: String? {
        switch self {
        case .configurationMissing: "The bundled API configuration is missing."
        case .invalidResponse: "The chore service returned an invalid response."
        case .invalidStatus: "Only completed or skipped can be submitted."
        case .server(let message): message
        }
    }
}
