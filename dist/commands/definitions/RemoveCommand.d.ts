import { Command, CommandContext } from "../CommandManager";
export declare class RemoveCommand implements Command {
    name: string;
    aliases: string[];
    description: string;
    usage: string;
    category: string;
    args: {
        name: string;
        description: string;
        required: boolean;
        type: "number";
    }[];
    execute(context: CommandContext, args: string[]): Promise<void | string>;
}
