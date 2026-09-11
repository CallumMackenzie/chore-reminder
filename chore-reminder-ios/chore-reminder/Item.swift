//
//  Item.swift
//  chore-reminder
//
//  Created by Callum Mackenzie on 2026-09-10.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
