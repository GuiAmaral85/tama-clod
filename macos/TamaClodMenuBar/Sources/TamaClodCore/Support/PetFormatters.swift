import Foundation

public enum PetFormatters {
    public static func tokens(_ value: Int) -> String {
        if value >= 1_000_000 {
            return String(format: "%.2fM", Double(value) / 1_000_000)
        }
        if value >= 1_000 {
            return String(format: "%.1fk", Double(value) / 1_000)
        }
        return String(value)
    }

    public static func idle(_ milliseconds: Int?) -> String {
        guard let milliseconds else {
            return "never"
        }

        let minutes = milliseconds / 60_000
        if minutes < 1 {
            return "just now"
        }
        if minutes < 60 {
            return "\(minutes) min"
        }

        let hours = minutes / 60
        if hours < 24 {
            return "\(hours) h \(minutes % 60) min"
        }

        let days = hours / 24
        return "\(days) d \(hours % 24) h"
    }
}
