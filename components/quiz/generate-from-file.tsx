'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, Loader2, FileText, FileX2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import type { GenerateQuizOutput } from '@/ai/flows/instructor-generates-quiz-from-topic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EDUCATIONAL_LEVELS, EDUCATIONAL_YEARS, type EducationalLevel } from '@/components/dashboards/student/educational-level-dialog';

const formSchema = z.object({
  numMcq: z.coerce.number().min(0).max(20),
  numText: z.coerce.number().min(0).max(20),
  educationalLevel: z.string().optional(),
  educationalYear: z.string().optional(),
}).refine(data => data.numMcq + data.numText > 0, {
  message: "You must generate at least one question.",
  path: ["numMcq"],
});

type GenerateFromFileProps = {
    onQuizGenerated: (data: GenerateQuizOutput) => void;
}

export function GenerateFromFile({ onQuizGenerated }: GenerateFromFileProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<EducationalLevel | ''>('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numMcq: 5,
      numText: 0,
      educationalLevel: '',
      educationalYear: '',
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officed.document.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  const handleGenerate = async (values: z.infer<typeof formSchema>) => {
    if (!file) {
      toast({ variant: 'destructive', title: 'No file selected', description: 'Please upload a file to generate a quiz.' });
      return;
    }
    
    setIsProcessing(true);
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/parse-file', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to parse the file.');
        }

        const textContent = result.text;
        
        if (!textContent || !textContent.trim()) {
            throw new Error('Could not extract any text from the file.');
        }

        const aiResponse = await fetch('/api/generate-quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                context: textContent,
                numMcq: values.numMcq,
                numText: values.numText,
                educationalLevel: values.educationalLevel || undefined,
                educationalYear: values.educationalYear || undefined,
            }),
        });

        const aiResult = (await aiResponse.json()) as GenerateQuizOutput | { error?: string };

        if (!aiResponse.ok) {
            throw new Error((aiResult as { error?: string }).error || 'Failed to generate quiz from file.');
        }

        if ('questions' in aiResult && Array.isArray(aiResult.questions) && aiResult.questions.length > 0) {
            toast({ title: 'Quiz Generated!', description: 'Review the questions before saving.' });
            onQuizGenerated(aiResult as GenerateQuizOutput);
        } else {
            throw new Error('The AI could not generate questions from the provided file. The content might be too short or unclear.');
        }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="space-y-6">
      {!file && (
        <div
          {...getRootProps()}
          className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="h-10 w-10" />
            <p className="font-semibold">Drag & drop a file here, or click to select</p>
            <p className="text-sm">Supports: PDF, DOCX, TXT</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
          >
            <Card className="bg-muted/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={removeFile}>
                  <FileX2 className="h-5 w-5 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={!file || isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
            {isProcessing ? 'Analyzing & Generating...' : 'Generate Quiz from File'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
