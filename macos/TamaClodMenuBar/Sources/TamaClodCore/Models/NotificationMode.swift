import Foundation

public enum NotificationMode: String, CaseIterable, Codable, Sendable {
    case appAnimated
    case macOS

    public var title: String {
        switch self {
        case .appAnimated:
            "Animated popover"
        case .macOS:
            "macOS notifications"
        }
    }
}
