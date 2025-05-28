import { Button } from "@/components/ui/button.js";
import { ArrowDown } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";

export type TDevice = { id: number; name: string; };
export function DeviceSelect<T extends TDevice>({ device, handleChange, choices }: { device: T | undefined, handleChange: (n: T) => void; choices: T[]; }) {
    if (choices === undefined) {
        return (
            <Button className="flex justify-between w-full mb-4 font-bold text-center truncate" variant="outline">
                <span className="mx-auto">{"No Device Found"}</span>
            </Button>
        );

    }
    if (choices.length === 1) {
        return (
            <Button className="flex justify-between w-full mb-4 font-bold text-center truncate" variant="outline">
                <span className="mx-auto">{device ? device.name : "No Device Found"}</span>
            </Button>
        );
    }
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild >
                <Button className="flex justify-between w-full mb-4 text-xl font-bold text-center" variant="outline">
                    <span className="mx-auto">{device ? device.name : "Choose device"}</span>
                    <ArrowDown className="text-gray-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 overflow-y-scroll ">
                <DropdownMenuRadioGroup
                    value={device ? device.id.toString() : "0"}
                    onValueChange={(s) => {
                        const selection = choices.find(c => c.id === Number(s));
                        if (!selection) {
                            console.error(`Device Select could not find device of id: ${s} choices: ${JSON.stringify(choices)}`);
                            return;
                        }
                        handleChange(selection);
                    }}
                >
                    {choices.map(c => (
                        < DropdownMenuRadioItem
                            key={`dk-${c.id}`}
                            className={`py-8 border-b mx-auto border-gray-500 rounded-none last:border-none text-center font-semibold`}
                            value={c.id.toString()}
                        >
                            {c.name}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>

        </DropdownMenu >
    );
};