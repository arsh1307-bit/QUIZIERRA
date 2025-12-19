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
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import type { GenerateQuizOutput } from '@/ai/flows/instructor-generates-quiz-from-topic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EDUCATIONAL_LEVELS, EDUCATIONAL_YEARS, type EducationalLevel } from '@/components/dashboards/student/educational-level-dialog';

const formSchema = z.object({
  context: z.string().min(50, { message: 'Please provide at least 50 characters of context.' }),
  numMcq: z.coerce.number().min(0).max(20),
  numText: z.coerce.number().min(0).max(20),
  educationalLevel: z.string().optional(),
  educationalYear: z.string().optional(),
}).refine(data => data.numMcq + data.numText > 0, {
  message: "You must generate at least one question.",
  path: ["numMcq"],
});


type GenerateFromTextProps = {
    onQuizGenerated: (data: GenerateQuizOutput) => void;
}

export function GenerateFromText({ onQuizGenerated }: GenerateFromTextProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<EducationalLevel | ''>('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      context: '',
      numMcq: 5,
      numText: 0,
      educationalLevel: '',
      educationalYear: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          educationalLevel: values.educationalLevel || undefined,
          educationalYear: values.educationalYear || undefined,
        }),
      });

      const result = (await response.json()) as GenerateQuizOutput | { error?: string };

      if (!response.ok) {
        throw new Error((result as { error?: string }).error || 'Failed to generate quiz from text.');
      }

      if ('questions' in result && Array.isArray(result.questions) && result.questions.length > 0) {
        toast({ title: 'Quiz Generated!', description: 'Review the questions before saving.' });
        onQuizGenerated(result as GenerateQuizOutput);
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
                        <Select 
                            onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedLevel(value as EducationalLevel);
                                form.setValue('educationalYear', '');
                            }} 
                            value={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {EDUCATIONAL_LEVELS.map((level) => (
                                    <SelectItem key={level.value} value={level.value}>
                                        {level.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="educationalYear"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Year/Grade (Optional)</FormLabel>
                        <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!selectedLevel}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={selectedLevel ? "Select year" : "Select level first"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {selectedLevel && EDUCATIONAL_YEARS[selectedLevel]?.map((year) => (
                                    <SelectItem key={year} value={year}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
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
