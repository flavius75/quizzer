import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Globe, Lock, Eye } from "lucide-react"
 
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Updated type to match your backend data structure
export type QuizData = {
  id: number
  title: string
  category: string
  creator: {
    id: number
    username: string
    email?: string
    role: string
    global_score: number
  } | null
  visibility: "public" | "private"
  created_at: string
  updated_at: string
  questions_count: number
  uuid: string
}

interface ColumnsProps {
  onEdit?: (quizId: number) => void
  onDelete?: (quizId: number) => void
}

export const createColumns = ({ onEdit, onDelete }: ColumnsProps = {}): ColumnDef<QuizData>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
        {row.getValue("id")}
      </div>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <div className="font-medium truncate" title={row.getValue("title")}>
          {row.getValue("title")}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {row.original.questions_count} question{row.original.questions_count !== 1 ? 's' : ''}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.getValue("category")}
      </Badge>
    ),
  },
  {
    accessorKey: "creator.username",
    header: "Author",
    cell: ({ row }) => {
      const creator = row.original.creator;
      if (!creator) return <span className="text-gray-400">Unknown</span>;
      
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {creator.username.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm">{creator.username}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "visibility",
    header: "Visibility",
    cell: ({ row }) => {
      const visibility = row.getValue("visibility") as string;
      return (
        <div className="flex items-center gap-1">
          {visibility === "public" ? (
            <>
              <Globe size={14} className="text-green-600" />
              <Badge variant="outline" className="text-green-600 border-green-200">
                Public
              </Badge>
            </>
          ) : (
            <>
              <Lock size={14} className="text-orange-600" />
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Private
              </Badge>
            </>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return (
        <div className="text-sm">
          <div>{date.toLocaleDateString()}</div>
          <div className="text-xs text-gray-500">{date.toLocaleTimeString()}</div>
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const quiz = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(quiz.uuid)}
              className="cursor-pointer"
            >
              <Eye className="mr-2 h-4 w-4" />
              Copy Quiz UUID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(quiz.id)} className="cursor-pointer">
                Edit Quiz
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem 
                onClick={() => onDelete(quiz.id)} 
                className="cursor-pointer text-red-600"
              >
                Delete Quiz
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

// Default columns for backward compatibility
export const columns = createColumns();