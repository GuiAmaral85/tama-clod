import Foundation
import TamaClodCore

@MainActor
protocol AnimatedMilestonePresenting: AnyObject {
    func presentAnimatedMilestone(_ event: MilestoneEvent)
}

@MainActor
final class AppModel: ObservableObject {
    @Published private(set) var petState: PetState?
    @Published private(set) var visual: PetVisualConfig
    @Published private(set) var connectionState: ServerConnectionState = .disconnected
    @Published var lastMilestone: MilestoneEvent?
    @Published var highlightID = UUID()
    @Published var notificationPermissionDenied = false
    @Published var notificationMode: NotificationMode {
        didSet {
            UserDefaults.standard.set(notificationMode.rawValue, forKey: Self.notificationModeKey)
        }
    }

    weak var animatedPresenter: AnimatedMilestonePresenting?

    private static let notificationModeKey = "tamaClod.notificationMode"
    private let port = 4321
    private let notificationService = UserNotificationService()
    private var serverProcess: NodeServerProcess?
    private var streamTask: Task<Void, Never>?
    private var pollTask: Task<Void, Never>?
    private var previousState: PetState?
    private var milestoneTracker = MilestoneTracker()

    init() {
        let rawMode = UserDefaults.standard.string(forKey: Self.notificationModeKey)
        notificationMode = NotificationMode(rawValue: rawMode ?? "") ?? .appAnimated
        visual = PetVisualMapper.buildLive(stage: 0, energy: 100, hunger: 0)
    }

    var baseURL: URL {
        URL(string: "http://127.0.0.1:\(port)")!
    }

    func start() {
        guard streamTask == nil else {
            return
        }

        connectionState = .starting

        do {
            let repoRoot = try resolveRepoRoot()
            let process = NodeServerProcess(repoRoot: repoRoot, port: port)
            try process.start()
            serverProcess = process
        } catch {
            connectionState = .failed(error.localizedDescription)
        }

        let client = PetStateClient(baseURL: baseURL)
        streamTask = Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(800))
            await self?.connect(client: client)
        }
    }

    func stop() {
        streamTask?.cancel()
        streamTask = nil
        pollTask?.cancel()
        pollTask = nil
        serverProcess?.stop()
        serverProcess = nil
        connectionState = .disconnected
    }

    func refresh() {
        let client = PetStateClient(baseURL: baseURL)
        Task { @MainActor [weak self] in
            do {
                let state = try await client.fetchState()
                self?.apply(state)
            } catch {
                self?.connectionState = .failed(error.localizedDescription)
            }
        }
    }

    private func connect(client: PetStateClient) async {
        connectionState = .connecting

        do {
            let snapshot = try await client.fetchState()
            apply(snapshot)
            connectionState = .connected

            for try await state in client.streamStates() {
                apply(state)
                connectionState = .connected
            }
            startPolling(client: client)
        } catch {
            connectionState = .failed(error.localizedDescription)
            startPolling(client: client)
        }
    }

    private func resolveRepoRoot() throws -> URL {
        if let path = Bundle.main.object(forInfoDictionaryKey: "TamaClodRepoRoot") as? String,
           !path.isEmpty {
            return URL(fileURLWithPath: path)
        }

        let start = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        return try RepoRootResolver.findRepoRoot(startingAt: start)
    }

    private func startPolling(client: PetStateClient) {
        pollTask?.cancel()
        pollTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                do {
                    let state = try await client.fetchState()
                    self?.apply(state)
                    self?.connectionState = .connected
                } catch {
                    self?.connectionState = .failed(error.localizedDescription)
                }
                try? await Task.sleep(for: .seconds(5))
            }
        }
    }

    private func apply(_ state: PetState) {
        petState = state
        visual = PetVisualMapper.buildLive(from: state)

        let events = MilestoneDetector.detect(previous: previousState, current: state)
        previousState = state

        for event in events where milestoneTracker.shouldDeliver(event) {
            milestoneTracker.markDelivered(event)
            lastMilestone = event
            Task { @MainActor [weak self] in
                await self?.deliver(event)
            }
        }
    }

    private func deliver(_ event: MilestoneEvent) async {
        switch notificationMode {
        case .appAnimated:
            animatedPresenter?.presentAnimatedMilestone(event)
        case .macOS:
            let delivered = await notificationService.deliver(event)
            if delivered {
                notificationPermissionDenied = false
            } else {
                notificationPermissionDenied = true
                animatedPresenter?.presentAnimatedMilestone(event)
            }
        }
    }
}
