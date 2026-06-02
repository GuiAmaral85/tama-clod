import Foundation
import Testing
@testable import TamaClodCore

@Test func parserEmitsDataFramesAndIgnoresHeartbeatComments() {
    var parser = SSEParser()

    let frames = parser.append("retry: 3000\n\n: ping\n\ndata: {\"stage\":1}\n\n".data(using: .utf8)!)

    #expect(frames == ["{\"stage\":1}"])
}

@Test func parserBuffersPartialChunksUntilBlankLine() {
    var parser = SSEParser()

    let first = parser.append("data: {\"stage\"".data(using: .utf8)!)
    let second = parser.append(":2}\n\n".data(using: .utf8)!)

    #expect(first.isEmpty)
    #expect(second == ["{\"stage\":2}"])
}

@Test func parserJoinsMultipleDataLinesWithNewlines() {
    var parser = SSEParser()

    let frames = parser.append("data: one\ndata: two\n\n".data(using: .utf8)!)

    #expect(frames == ["one\ntwo"])
}
