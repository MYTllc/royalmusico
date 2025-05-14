import { Command, CommandContext } from "../CommandManager";
export declare class SkipCommand implements Command {
    name: string;
    aliases: string[];
    description: string;
    usage: string;
    category: string;
    execute(context: CommandContext, args: string[]): Promise<void | string>;
}
