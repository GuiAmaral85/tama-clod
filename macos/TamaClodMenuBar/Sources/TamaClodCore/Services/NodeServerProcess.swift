import Foundation

public final class NodeServerProcess: @unchecked Sendable {
    public enum Error: LocalizedError, Sendable {
        case alreadyRunning

        public var errorDescription: String? {
            switch self {
            case .alreadyRunning:
                "The TAMA CLOD Node server process is already running."
            }
        }
    }

    public let repoRoot: URL
    public let port: Int
    private var process: Process?

    public init(repoRoot: URL, port: Int = 4321) {
        self.repoRoot = repoRoot
        self.port = port
    }

    public var isRunning: Bool {
        process?.isRunning == true
    }

    public func start() throws {
        if isRunning {
            throw Error.alreadyRunning
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["npm", "run", "mac:server"]
        process.currentDirectoryURL = repoRoot

        var environment = ProcessInfo.processInfo.environment
        environment["PORT"] = String(port)
        environment["TAMA_CLOD_MAC_APP"] = "1"
        process.environment = environment

        let output = Pipe()
        process.standardOutput = output
        process.standardError = output

        try process.run()
        self.process = process
    }

    public func stop() {
        guard let process else {
            return
        }

        if process.isRunning {
            process.terminate()
        }
        self.process = nil
    }

    deinit {
        stop()
    }
}
