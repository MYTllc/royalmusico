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
const ShuffleCommand_1 = require("../../definitions/ShuffleCommand");
const QueueManager_1 = require("../../../queue/QueueManager");
// Mocks
jest.mock("../../../queue/QueueManager");
const MockQueueManager = QueueManager_1.QueueManager;
describe("ShuffleCommand", () => {
    let shuffleCommand;
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
        shuffleCommand = new ShuffleCommand_1.ShuffleCommand();
    });
    test("should shuffle the queue and return confirmation if queue is not empty", () => __awaiter(void 0, void 0, void 0, function* () {
        mockQueueManager.getSize.mockReturnValue(5); // Simulate a non-empty queue
        const result = yield shuffleCommand.execute(mockContext, []);
        expect(mockQueueManager.shuffle).toHaveBeenCalled();
        expect(result).toBe("Queue shuffled! 🔀");
        expect(mockMusicBot.emit).toHaveBeenCalledWith("shuffled", mockContext);
    }));
    test("should return a message if the queue is empty", () => __awaiter(void 0, void 0, void 0, function* () {
        mockQueueManager.getSize.mockReturnValue(0); // Simulate an empty queue
        const result = yield shuffleCommand.execute(mockContext, []);
        expect(mockQueueManager.shuffle).not.toHaveBeenCalled();
        expect(result).toBe("The queue is currently empty, nothing to shuffle.");
        expect(mockMusicBot.emit).not.toHaveBeenCalledWith("shuffled", mockContext);
    }));
});
