import Foundation

public enum RepoRootResolver {
    public enum Error: LocalizedError, Equatable {
        case notFound(URL)

        public var errorDescription: String? {
            switch self {
            case .notFound(let start):
                "Could not find tama-clod repo root starting at \(start.path)"
            }
        }
    }

    public static func findRepoRoot(startingAt start: URL) throws -> URL {
        var current = start.standardizedFileURL
        let fileManager = FileManager.default

        while true {
            let packageURL = current.appendingPathComponent("package.json")
            let serverURL = current.appendingPathComponent("server/server.ts")

            if fileManager.fileExists(atPath: packageURL.path),
               fileManager.fileExists(atPath: serverURL.path),
               let package = try? String(contentsOf: packageURL, encoding: .utf8),
               package.contains("\"name\""),
               package.contains("tama-clod") {
                return current
            }

            let parent = current.deletingLastPathComponent()
            if parent.path == current.path {
                throw Error.notFound(start)
            }
            current = parent
        }
    }
}
