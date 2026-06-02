import Foundation

public struct PetState: Codable, Equatable, Sendable {
    public let stage: Int
    public let isEgg: Bool
    public let growthTokens: Int
    public let energy: Double
    public let hunger: Double
    public let lastActivityTs: Int?
    public let msSinceActivity: Int?

    public init(
        stage: Int,
        isEgg: Bool,
        growthTokens: Int,
        energy: Double,
        hunger: Double,
        lastActivityTs: Int?,
        msSinceActivity: Int?
    ) {
        self.stage = stage
        self.isEgg = isEgg
        self.growthTokens = growthTokens
        self.energy = energy
        self.hunger = hunger
        self.lastActivityTs = lastActivityTs
        self.msSinceActivity = msSinceActivity
    }
}
