import Foundation

public struct SSEParser: Sendable {
    private var buffer = ""

    public init() {}

    public mutating func append(_ data: Data) -> [String] {
        guard let text = String(data: data, encoding: .utf8), !text.isEmpty else {
            return []
        }

        buffer += text
        var frames: [String] = []

        while let range = nextFrameRange(in: buffer) {
            let frame = String(buffer[..<range.lowerBound])
            buffer.removeSubrange(buffer.startIndex..<range.upperBound)
            if let payload = parseFrame(frame) {
                frames.append(payload)
            }
        }

        return frames
    }

    private func nextFrameRange(in text: String) -> Range<String.Index>? {
        text.range(of: "\n\n") ?? text.range(of: "\r\n\r\n")
    }

    private func parseFrame(_ frame: String) -> String? {
        var dataLines: [String] = []

        for rawLine in frame.components(separatedBy: .newlines) {
            let line = rawLine.trimmingCharacters(in: CharacterSet(charactersIn: "\r"))
            if line.isEmpty || line.hasPrefix(":") {
                continue
            }
            guard line.hasPrefix("data:") else {
                continue
            }
            var value = String(line.dropFirst(5))
            if value.hasPrefix(" ") {
                value.removeFirst()
            }
            dataLines.append(value)
        }

        guard !dataLines.isEmpty else {
            return nil
        }

        return dataLines.joined(separator: "\n")
    }
}
