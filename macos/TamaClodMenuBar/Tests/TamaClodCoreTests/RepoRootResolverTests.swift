import Foundation
import Testing
@testable import TamaClodCore

@Test func resolverFindsRepoRootByPackageAndServerFiles() throws {
    let root = URL(fileURLWithPath: NSTemporaryDirectory())
        .appendingPathComponent(UUID().uuidString)
    let nested = root.appendingPathComponent("macos/TamaClodMenuBar")
    try FileManager.default.createDirectory(
        at: nested,
        withIntermediateDirectories: true
    )
    try FileManager.default.createDirectory(
        at: root.appendingPathComponent("server"),
        withIntermediateDirectories: true
    )
    try """
    {"name":"tama-clod"}
    """.write(
        to: root.appendingPathComponent("package.json"),
        atomically: true,
        encoding: .utf8
    )
    try "".write(
        to: root.appendingPathComponent("server/server.ts"),
        atomically: true,
        encoding: .utf8
    )

    let resolved = try RepoRootResolver.findRepoRoot(startingAt: nested)

    #expect(resolved.standardizedFileURL.path == root.standardizedFileURL.path)
}
