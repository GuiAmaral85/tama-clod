import Foundation

public struct PetStateClient: Sendable {
    public enum Error: LocalizedError, Sendable {
        case invalidResponse(URL)
        case nonHTTPResponse(URL)
        case unexpectedStatusCode(Int, URL)

        public var errorDescription: String? {
            switch self {
            case .invalidResponse(let url):
                "Invalid response from \(url.absoluteString)"
            case .nonHTTPResponse(let url):
                "Expected HTTP response from \(url.absoluteString)"
            case .unexpectedStatusCode(let status, let url):
                "Unexpected HTTP \(status) from \(url.absoluteString)"
            }
        }
    }

    public let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder

    public init(
        baseURL: URL,
        session: URLSession = .shared,
        decoder: JSONDecoder = JSONDecoder()
    ) {
        self.baseURL = baseURL
        self.session = session
        self.decoder = decoder
    }

    public func fetchState() async throws -> PetState {
        let url = baseURL.appendingPathComponent("api/state")
        let (data, response) = try await session.data(from: url)
        try validate(response: response, url: url)
        return try decoder.decode(PetState.self, from: data)
    }

    public func streamStates() -> AsyncThrowingStream<PetState, Swift.Error> {
        let url = baseURL.appendingPathComponent("api/stream")
        let session = session
        let decoder = decoder

        return AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let (bytes, response) = try await session.bytes(from: url)
                    try validate(response: response, url: url)

                    var parser = SSEParser()
                    for try await line in bytes.lines {
                        try Task.checkCancellation()
                        let frames = parser.append(Data((line + "\n").utf8))
                        for frame in frames {
                            guard let data = frame.data(using: .utf8) else {
                                continue
                            }
                            continuation.yield(try decoder.decode(PetState.self, from: data))
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }

            continuation.onTermination = { _ in
                task.cancel()
            }
        }
    }

    private func validate(response: URLResponse, url: URL) throws {
        guard let http = response as? HTTPURLResponse else {
            throw Error.nonHTTPResponse(url)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw Error.unexpectedStatusCode(http.statusCode, url)
        }
    }
}
