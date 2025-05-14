import { Command, CommandContext } from "../CommandManager";
export declare class PauseCommand implements Command {
    name: string;
    description: string;
    usage: string;
    category: string;
    execute(context: CommandContext, args: string[]): Promise<void | string>;
}
