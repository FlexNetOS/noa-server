'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getSocket } from '@/lib/websocket';

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  domain: z.enum([
    'engineering',
    'design',
    'marketing',
    'product',
    'project-management',
    'studio-operations',
    'testing',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  requirements: z.array(z.string()),
  constraints: z.array(z.string()),
});

export function FeatureRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRequirement, setNewRequirement] = useState('');
  const [newConstraint, setNewConstraint] = useState('');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      domain: 'engineering',
      priority: 'medium',
      requirements: [],
      constraints: [],
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const socket = getSocket();
      socket.emit('workflow:submit', values);

      toast({
        title: 'Feature Request Submitted',
        description: 'Your workflow has been created and agents are being assigned.',
      });

      form.reset();
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit feature request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      const current = form.getValues('requirements');
      form.setValue('requirements', [...current, newRequirement.trim()]);
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    const current = form.getValues('requirements');
    form.setValue(
      'requirements',
      current.filter((_, i) => i !== index)
    );
  };

  const addConstraint = () => {
    if (newConstraint.trim()) {
      const current = form.getValues('constraints');
      form.setValue('constraints', [...current, newConstraint.trim()]);
      setNewConstraint('');
    }
  };

  const removeConstraint = (index: number) => {
    const current = form.getValues('constraints');
    form.setValue(
      'constraints',
      current.filter((_, i) => i !== index)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Feature Request</CardTitle>
        <CardDescription>
          Create a new workflow for automated development from specs to deployment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature Title</FormLabel>
                  <FormControl>
                    <Input placeholder="AI-Powered User Authentication" {...field} />
                  </FormControl>
                  <FormDescription>A clear, concise title for your feature</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Implement OAuth 2.0 with JWT tokens and biometric support..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Detailed description of the feature</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select domain" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="project-management">Project Management</SelectItem>
                        <SelectItem value="studio-operations">Studio Operations</SelectItem>
                        <SelectItem value="testing">Testing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirements</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a requirement..."
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === 'Enter' && (e.preventDefault(), addRequirement())
                      }
                    />
                    <Button type="button" size="icon" onClick={addRequirement}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {field.value.map((req, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <span className="text-sm">{req}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeRequirement(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="constraints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Constraints (Optional)</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a constraint..."
                      value={newConstraint}
                      onChange={(e) => setNewConstraint(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addConstraint())}
                    />
                    <Button type="button" size="icon" onClick={addConstraint}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {field.value.map((constraint, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <span className="text-sm">{constraint}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeConstraint(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Feature Request
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
