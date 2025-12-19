'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { generateQuiz } from '@/ai/flows/instructor-generates-quiz-from-topic';
import { educationalLevelOptions, getYearOptions } from '@/components/dashboards/educational-level-dialog';
import type { EducationalLevel } from '@/lib/types';

const formSchema = z.object({
  context: z.string().min(50, { message: 'Please provide at least 50 characters of context.' }),
  numMcq: z.coerce.number().min(0).max(20),
  numText: z.coerce.number().min(0).max(20),
  educationalLevel: z.enum(['middle_school', 'high_school', 'junior_college', 'diploma', 'graduation', 'post_graduation']).optional(),
  educationalYear: z.string().optional(),
}).refine(data => data.numMcq + data.numText > 0, {
  message: "You must generate at least one question.",
  path: ["numMcq"],
});


type GenerateFromTextProps = {
    onQuizGenerated: (data: {title: string, questions: any[]}) => void;
}

export function GenerateFromText({ onQuizGenerated }: GenerateFromTextProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      context: '',
      numMcq: 5,
      numText: 0,
      educationalLevel: undefined,
      educationalYear: undefined,
    },
  });

  const selectedLevel = form.watch('educationalLevel');
  const yearOptions = selectedLevel ? getYearOptions(selectedLevel as EducationalLevel) : [];

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsGenerating(true);
    try {
        const result = await generateQuiz({
          context: values.context,
          numMcq: values.numMcq,
          numText: values.numText,
          educationalLevel: values.educationalLevel,
          educationalYear: values.educationalYear,
        });
        if (result.questions && result.questions.length > 0) {
            toast({ title: 'Quiz Generated!', description: 'Review the questions before saving.' });
            onQuizGenerated({title: result.title, questions: result.questions});
        } else {
            throw new Error('The AI could not generate questions from the provided text.');
        }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not generate quiz from text.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
            control={form.control}
            name="context"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Topic or Text Content</FormLabel>
                <FormControl>
                    <Textarea
                    placeholder="e.g., Paste a chapter from a textbook, an article, or describe a topic like 'The basics of Photosynthesis'."
                    className="min-h-[150px]"
                    {...field}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="numMcq"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>MCQ Questions</FormLabel>
                        <FormControl>
                        <Input type="number" min={0} max={20} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="numText"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Text Questions</FormLabel>
                        <FormControl>
                        <Input type="number" min={0} max={20} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="educationalLevel"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Target Educational Level (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select level..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {educationalLevelOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                {selectedLevel && yearOptions.length > 0 && (
                    <FormField
                        control={form.control}
                        name="educationalYear"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Year/Grade (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select year..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {yearOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}
            </div>
             <FormMessage>{form.formState.errors.root?.message}</FormMessage>

            <Button type="submit" className="w-full" disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {isGenerating ? 'Generating Quiz...' : 'Generate with AI'}
            </Button>
        </form>
    </Form>
  );
}
