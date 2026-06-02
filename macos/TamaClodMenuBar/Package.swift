// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "TamaClodMenuBar",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .library(name: "TamaClodCore", targets: ["TamaClodCore"]),
        .executable(name: "TamaClodMenuBar", targets: ["TamaClodMenuBar"])
    ],
    targets: [
        .target(name: "TamaClodCore"),
        .executableTarget(
            name: "TamaClodMenuBar",
            dependencies: ["TamaClodCore"]
        ),
        .testTarget(
            name: "TamaClodCoreTests",
            dependencies: ["TamaClodCore"]
        )
    ]
)
