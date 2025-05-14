"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const RemoveCommand_1 = require("../../definitions/RemoveCommand");
const QueueManager_1 = require("../../../queue/QueueManager");
// Mocks
jest.mock("../../../queue/QueueManager");
const MockQueueManager = QueueManager_1.QueueManager;
const track1 = { id: "t1", title: "Track One", url: "http://example.com/t1", source: "youtube", duration: 180 };
const track2 = { id: "t2", title: "Track Two", url: "http://example.com/t2", source: "soundcloud", duration: 240 };
describe("RemoveCommand", () => {
    let removeCommand;
    let mockMusicBot;
    let mockContext;
    let mockQueueManager;
    beforeEach(() => {
        MockQueueManager.mockClear();
        mockQueueManager = new MockQueueManager();
        mockMusicBot = {
            queueManager: mockQueueManager,
            emit: jest.fn(),
        };
        mockContext = { musicBot: mockMusicBot };
        removeCommand = new RemoveCommand_1.RemoveCommand();
    });
    test("should return usage if no track number is provided", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield removeCommand.execute(mockContext, []);
        expect(result).toBe("Please provide the track number to remove. Usage: `!remove <track number>`");
    }));
    test("should return error if track number is not a number", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield removeCommand.execute(mockContext, ["abc"]);
        expect(result).toBe("Invalid track number. Please provide a valid number from the queue.");
    }));
    test("should return error if track number is less than 1", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield removeCommand.execute(mockContext, ["0"]);
        expect(result).toBe("Invalid track number. Please provide a valid number from the queue.");
    }));
    test("should remove a track and return confirmation", () => __awaiter(void 0, void 0, void 0, function* () {
        mockQueueManager.remove.mockReturnValue(track1); // Simulate successful removal
        mockQueueManager.getSize.mockReturnValue(1); // Queue size after removal
        const result = yield removeCommand.execute(mockContext, ["2"]); // User inputs 1-based index
        expect(mockQueueManager.remove).toHaveBeenCalledWith(2); // Manager uses 1-based index internally as per its design
        expect(result).toBe(`Removed: **${track1.title}** from the queue.`);
        expect(mockMusicBot.emit).toHaveBeenCalledWith("trackRemoved", track1, 1, mockContext);
    }));
    test("should return a message if the track to remove is not found", () => __awaiter(void 0, void 0, void 0, function* () {
        mockQueueManager.remove.mockReturnValue(null); // Simulate track not found
        const result = yield removeCommand.execute(mockContext, ["99"]);
        expect(mockQueueManager.remove).toHaveBeenCalledWith(99);
        expect(result).toBe("Could not find a track at that position.");
        expect(mockMusicBot.emit).not.toHaveBeenCalledWith("trackRemoved", expect.anything(), expect.anything(), mockContext);
    }));
    test("should return a message if the queue is empty", () => __awaiter(void 0, void 0, void 0, function* () {
        mockQueueManager.getSize.mockReturnValue(0);
        const result = yield removeCommand.execute(mockContext, ["1"]);
        // The check for empty queue might be inside the command or rely on remove returning null
        // If remove is called, it should return null for an empty queue for a valid index like 1.
        // Depending on QueueManager.remove behavior for empty queue:
        // Option 1: remove returns null if queue is empty
        mockQueueManager.remove.mockReturnValue(null);
        expect(result).toBe("Could not find a track at that position."); // Or a more specific "Queue is empty."
        // Option 2: The command checks queue size first (better)
        // This test assumes the command relies on QueueManager.remove's return value.
    }));
});
