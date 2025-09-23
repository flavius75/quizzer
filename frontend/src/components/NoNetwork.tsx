import { ServerOff } from 'lucide-react';

export default function NoNetwork(){
    return (
        <div className="flex-col gap-3 p-4 flex justify-center items-center ">
            <ServerOff  size={100} />

            <h2 className="text-2xl font-bold">No connection to the server</h2>
        </div>
    )
}