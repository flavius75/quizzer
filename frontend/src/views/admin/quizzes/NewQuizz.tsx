import { Button } from "@/components/ui/button"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import placeholder from "@/assets/placeholder.png"
import { z } from "zod"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
  
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from "@/components/ui/form"
  import { Input } from "@/components/ui/input"
import { Divide } from "lucide-react"

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
})

export default function NewQuizz() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          username: "",
        },
      })
    
      // 2. Define a submit handler.
      function onSubmit(values: z.infer<typeof formSchema>) {
        // Do something with the form values.
        // ✅ This will be type-safe and validated.
        console.log(values)
      }

    return(
        <>
        <div className="flex justify-between items-center">

            <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-5xl p-6">
                New quiz
            </h1>
            <Button className="mx-6">Save</Button>
        </div>


        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">


        <Card className="m-6">
            <CardHeader>
                <CardTitle>Quiz information</CardTitle>
                <CardDescription>Information for the Quizz Card</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-row">
                    <div className="flex flex-col justify-center items-center">
                        <img src={placeholder} alt="Quizz image" width={210} height={210}/>
                        <Button className="m-3">Set image</Button>
                    </div>
                    <div className="ml-10">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem className="my-6 px-6">
                                    <FormLabel>Quiz Name</FormLabel>
                                    <div className="flex flex-row">
                                        <div>
                                            <FormControl>
                                                <Input placeholder="shadcn" className="w-lg" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </div>
                                    </div>
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem className="my-6 px-6">
                                    <FormLabel>Category</FormLabel>
                                    <div className="flex flex-row">
                                        <div>
                                            <FormControl>
                                            <Select>
                                                <SelectTrigger className="w-lg">
                                                    <SelectValue placeholder="--" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                    <SelectItem value="apple">Science</SelectItem>
                                                    <SelectItem value="banana">General</SelectItem>
                                                    <SelectItem value="blueberry">Entertainment</SelectItem>
                                                    <SelectItem value="grapes">Technology</SelectItem>
                                                    <SelectItem value="pineapple">History</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </div>
                                    </div>
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem className="my-6 px-6">
                                    <FormLabel>Type</FormLabel>
                                    <div className="flex flex-row">
                                        <div>
                                            <FormControl>
                                            <Select>
                                                <SelectTrigger className="w-lg">
                                                    <SelectValue placeholder="--" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                    <SelectItem value="apple">Single choice</SelectItem>
                                                    <SelectItem value="banana">Multiple Choice</SelectItem>
                                                    <SelectItem value="blueberry">Blank space</SelectItem>
                                                    <SelectItem value="grapes">Poll</SelectItem>
                                                    <SelectItem value="pineapple">True/False</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </div>
                                    </div>
                                </FormItem>
                            )}
                            />
                    </div>
                </div>
            </CardContent>
        </Card>



        <h2 className="scroll-m-20 text-xl font-extrabold tracking-tight lg:text-3xl p-6">
            Questions
        </h2>

        <Card className="m-6">
        <CardContent>
        <span className="flex items-center gap-2 text-md leading-none font-medium select-none mr-6 mb-4">Question 1 </span>
        <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
                <FormItem className=" flex-row mb-6">
                    <div className="flex flex-row align-middle">
                    <FormLabel className="mr-6">Title </FormLabel>
                        <div>
                            <FormControl>
                                <Input placeholder="Text" className="w-lg" {...field} />
                            </FormControl>
                            <FormMessage />
                        </div>
                    </div>
                </FormItem>
            )}
            />

        <span className="flex items-center gap-2 text-md leading-none font-medium select-none mr-6 mb-4">Choices</span>
        
        <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
                <div className="flex flex-col justify-between">
                    <FormItem className="flex-row">
                        <div className="flex flex-row align-middle">
                        <FormLabel className="mr-4">A </FormLabel>
                            <div>
                                <FormControl>
                                    <Input placeholder="Text" className="w-lg" {...field} />
                                </FormControl>
                                <FormMessage />
                            </div>
                        </div>
                    </FormItem>
                    <FormItem className=" flex-row">
                        <div className="flex flex-row align-middle">
                        <FormLabel className="mr-4">B </FormLabel>
                            <div>
                                <FormControl>
                                    <Input placeholder="Text" className="w-lg" {...field} />
                                </FormControl>
                                <FormMessage />
                            </div>
                        </div>
                    </FormItem>
                    <FormItem className=" flex-row">
                        <div className="flex flex-row align-middle">
                        <FormLabel className="mr-4">C </FormLabel>
                            <div>
                                <FormControl>
                                    <Input placeholder="Text" className="w-lg" {...field} />
                                </FormControl>
                                <FormMessage />
                            </div>
                        </div>
                    </FormItem>
                    <FormItem className=" flex-row">
                        <div className="flex flex-row align-middle">
                        <FormLabel className="mr-4">D </FormLabel>
                            <div>
                                <FormControl>
                                    <Input placeholder="Text" className="w-lg" {...field} />
                                </FormControl>
                                <FormMessage />
                            </div>
                        </div>
                    </FormItem>
                </div>
            )}
            />

        <span className="flex items-center gap-2 text-md leading-none font-medium select-none mr-6 mb-4">Answer</span>

        <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
                <FormItem className=" flex-row mb-6">
                    <div className="flex flex-row align-middle">
                    <FormLabel className="mr-6">Title </FormLabel>
                        <div>
                            <FormControl>
                                <Input placeholder="Text" className="w-lg" {...field} />
                            </FormControl>
                            <FormMessage />
                        </div>
                    </div>
                </FormItem>
            )}
            />


        </CardContent>
        </Card>

        <Button className="m-6">Add question</Button>
        
        </form>
        </Form>

        
    </>
    )
}

