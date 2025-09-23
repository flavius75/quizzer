import { Button } from "@/components/ui/button"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import placeholder from "@/assets/placeholder.png"
import { z } from "zod"
import { useState } from "react";
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
import axios from "axios"

const questionSchema = z.object({
  mainQuestion: z.string().min(2, { message: "Question title must be at least 2 characters." }),
  choices: z.object({
    A: z.string().min(1, { message: "Choice A is required." }),
    B: z.string().min(1, { message: "Choice B is required." }),
    C: z.string().min(1, { message: "Choice C is required." }),
    D: z.string().min(1, { message: "Choice D is required." }),
  }),
  correctAnswer: z.enum(["A", "B", "C", "D"], { message: "Answer must be one of A, B, C, or D." }),
});

// Extend the form schema to include questions
const formSchema = z.object({
  title: z.string().min(2, {
    message: "Quiz title must be at least 2 characters.",
  }),
  category: z.string().min(2, {
    message: "Quiz category must be at least 2 characters.",
  }),
  type: z.string().min(2, {
    message: "Quiz type must be at least 2 characters.",
  }),
  questions: z.array(questionSchema).min(1, { message: "At least one question is required." }),
});

export default function NewQuizz() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "",
      type: "",
      questions: [
        { mainQuestion: "", choices: { A: "", B: "", C: "", D: "" }, correctAnswer: "" },
      ],
    },
  });

  // Define the submit handler
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Log the entire form data object
    console.log("Quiz Data:", values);

    axios.post('http://127.0.0.1:8000/quizzes/', {
      quiz_data: values,
  })
    .then(function (response) {
      console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });

  }

  const addQuestion = () => {
    const currentQuestions = (form).getValues("questions");
    form.setValue("questions", [
      ...currentQuestions,
      { mainQuestion: "", choices: { A: "", B: "", C: "", D: "" }, correctAnswer: undefined },
    ]);
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-5xl p-6">
          New quiz
        </h1>
        <Button className="mx-6" type="submit" form="quiz-form">
          Save
        </Button>
      </div>

      <Form {...form}>
        <form
          id="quiz-form"
          onSubmit={form.handleSubmit(onSubmit)} // Attach the onSubmit handler
          className="space-y-8"
        >
          <Card className="m-6">
            <CardHeader>
              <CardTitle>Quiz information</CardTitle>
              <CardDescription>Information for the Quiz Card</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-row">
                <div className="flex flex-col justify-center items-center">
                  <img
                    src={placeholder}
                    alt="Quiz image"
                    width={210}
                    height={210}
                  />
                  <Button className="m-3">Set image</Button>
                </div>
                <div className="ml-10">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="my-6 px-6">
                        <FormLabel>Quiz Name</FormLabel>
                        <div className="flex flex-row">
                          <div>
                            <FormControl>
                              <Input
                                placeholder="Quiz title"
                                className="w-lg"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem className="my-6 px-6">
                        <FormLabel>Category</FormLabel>
                        <div className="flex flex-row">
                          <div>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <SelectTrigger className="w-lg">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectItem value="science">
                                      Science
                                    </SelectItem>
                                    <SelectItem value="general">
                                      General
                                    </SelectItem>
                                    <SelectItem value="entertainment">
                                      Entertainment
                                    </SelectItem>
                                    <SelectItem value="technology">
                                      Technology
                                    </SelectItem>
                                    <SelectItem value="history">
                                      History
                                    </SelectItem>
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
                    name="type"
                    render={({ field }) => (
                      <FormItem className="my-6 px-6">
                        <FormLabel>Type</FormLabel>
                        <div className="flex flex-row">
                          <div>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <SelectTrigger className="w-lg">
                                  <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectItem value="single_choice">
                                      Single choice
                                    </SelectItem>
                                    <SelectItem value="multi_choice">
                                      Multiple choice
                                    </SelectItem>
                                    <SelectItem value="poll">Poll</SelectItem>
                                    <SelectItem value="blank_space">Blank space</SelectItem>
                                    <SelectItem value="true_false">
                                      True/False
                                    </SelectItem>
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

          {form.watch("questions").map((question, index) => (
            <Card className="m-6" key={index}>
              <CardContent>
                <FormField
                  control={form.control}
                  name={`questions.${index}.mainQuestion`}
                  render={({ field }) => (
                    <FormItem className="mb-6">
                      <FormLabel>Question Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter question title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {["A", "B", "C", "D"].map((choice) => (
                  <FormField
                    key={choice}
                    control={form.control}
                    name={`questions.${index}.choices.${choice}`}
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Choice {choice}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={`Enter choice ${choice}`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <FormField
                  control={form.control}
                  name={`questions.${index}.correctAnswer`}
                  render={({ field }) => (
                    <FormItem className="mb-6">
                      <FormLabel>Correct Answer</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select the correct answer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {["A", "B", "C", "D"].map((choice) => (
                                <SelectItem key={choice} value={choice}>
                                  {choice}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          ))}

          <Button className="m-6" onClick={addQuestion}>
            Add Question
          </Button>
        </form>
      </Form>
    </>
  );
}