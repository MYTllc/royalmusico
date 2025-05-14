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
const LoopCommand_1 = require("../../definitions/LoopCommand");
const QueueManager_1 = require("../../../queue/QueueManager");
// Mocks
jest.mock("../../../queue/QueueManager");
const MockQueueManager = QueueManager_1.QueueManager;
describe("LoopCommand", () => {
    let loopCommand;
    let mockMusicBot;
    let mockContext;
    let mockQueueManager;
    beforeEach(() => {
        MockQueueManager.mockClear();
        mockQueueManager = new MockQueueManager();
        mockMusicBot = {
            queueManager: mockQueueManager,
            emit: jest.fn(),
            // other MusicBot properties if needed
        };
        mockContext = { musicBot: mockMusicBot };
        loopCommand = new LoopCommand_1.LoopCommand();
    });
    test("should return usage if no argument is provided", () => __awaiter(void 0, void 0, void 0, function* () {
        mockQueueManager.getLoopMode.mockReturnValue(QueueManager_1.LoopMode.NONE);
        const result = yield loopCommand.execute(mockContext, []);
        expect(result).toBe("Current loop mode: **None**. Usage: `!loop <none|track|queue>`");
    }));
    test("should set loop mode to NONE", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield loopCommand.execute(mockContext, ["none"]);
        expect(mockQueueManager.setLoopMode).toHaveBeenCalledWith(QueueManager_1.LoopMode.NONE);
        expect(result).toBe("Loop mode set to **None**.");
        expect(mockMusicBot.emit).toHaveBeenCalledWith("loopModeChanged", QueueManager_1.LoopMode.NONE, mockContext);
    }));
    test("should set loop mode to TRACK", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield loopCommand.execute(mockContext, ["track"]);
        expect(mockQueueManager.setLoopMode).toHaveBeenCalledWith(QueueManager_1.LoopMode.TRACK);
        expect(result).toBe("Loop mode set to **Track**.");
        expect(mockMusicBot.emit).toHaveBeenCalledWith("loopModeChanged", QueueManager_1.LoopMode.TRACK, mockContext);
    }));
    test("should set loop mode to QUEUE", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield loopCommand.execute(mockContext, ["queue"]);
        expect(mockQueueManager.setLoopMode).toHaveBeenCalledWith(QueueManager_1.LoopMode.QUEUE);
        expect(result).toBe("Loop mode set to **Queue**.");
        expect(mockMusicBot.emit).toHaveBeenCalledWith("loopModeChanged", QueueManager_1.LoopMode.QUEUE, mockContext);
    }));
    test("should be case-insensitive for arguments", () => __awaiter(void 0, void 0, void 0, function* () {
        yield loopCommand.execute(mockContext, ["TRACK"]);
        expect(mockQueueManager.setLoopMode).toHaveBeenCalledWith(QueueManager_1.LoopMode.TRACK);
        yield loopCommand.execute(mockContext, ["QuEuE"]);
        expect(mockQueueManager.setLoopMode).toHaveBeenCalledWith(QueueManager_1.LoopMode.QUEUE);
    }));
    test("should return an error for invalid loop mode", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield loopCommand.execute(mockContext, ["invalid"]);
        expect(mockQueueManager.setLoopMode).not.toHaveBeenCalled();
        expect(result).toBe("Invalid loop mode. Available modes: `none`, `track`, `queue`.");
        expect(mockMusicBot.emit).not.toHaveBeenCalledWith("loopModeChanged", expect.anything(), mockContext);
    }));
    test("should display current loop mode if argument is 'current' or similar", () => __awaiter(void 0, void 0, void 0, function* () {
        mockQueueManager.getLoopMode.mockReturnValue(QueueManager_1.LoopMode.TRACK);
        let result = yield loopCommand.execute(mockContext, ["current"]);
        expect(result).toBe("Current loop mode: **Track**. Usage: `!loop <none|track|queue>`");
        result = yield loopCommand.execute(mockContext, ["status"]);
        expect(result).toBe("Current loop mode: **Track**. Usage: `!loop <none|track|queue>`");
    }));
});
