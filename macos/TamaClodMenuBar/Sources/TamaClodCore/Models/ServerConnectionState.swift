import Foundation

public enum ServerConnectionState: Equatable, Sendable {
    case disconnected
    case starting
    case connecting
    case connected
    case failed(String)

    public var label: String {
        switch self {
        case .disconnected:
            "Disconnected"
        case .starting:
            "Starting server"
        case .connecting:
            "Connecting"
        case .connected:
            "Live"
        case .failed(let message):
            "Failed: \(message)"
        }
    }
}
