import {FolderOpen} from 'lucide-react'

export default function PlaceHolder(){
    return (
        <div className="flex-col gap-3 p-4 flex justify-center items-center ">
            <FolderOpen size={100} />

            <h2 className="text-2xl font-bold">No quizes. Make one !</h2>
        </div>
    )
}