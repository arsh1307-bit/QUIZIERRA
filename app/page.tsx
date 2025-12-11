'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, Bot, Car, ShieldCheck, Zap, BookOpen, Briefcase, GraduationCap, Building } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Header } from '@/components/layout/header';
import { PixelStars } from '@/components/pixel-stars';

const features = [
  {
    icon: <Zap className="h-8 w-8 text-primary" />,
    title: 'Instant & Reliable',
    description: 'Experience blazing-fast performance. Our deterministic autosave ensures every keystroke is captured instantly, so no work is ever lost.',
    image: PlaceHolderImages.find(img => img.id === 'feature-1'),
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: 'Secure & Fair',
    description: 'Advanced, consent-first proctoring with real-time event flagging creates a secure and fair testing environment for everyone.',
    image: PlaceHolderImages.find(img => img.id === 'feature-2'),
  },
  {
    icon: <Bot className="h-8 w-8 text-primary" />,
    title: 'AI-Powered Assistance',
    description: 'Our intelligent hint system guides students toward the correct answer without giving it away, powered by a secure, pluggable AI adapter.',
    image: PlaceHolderImages.find(img => img.id === 'feature-4'),
  },
  {
    icon: <Car className="h-8 w-8 text-primary" />,
    title: 'Engage & Motivate',
    description: 'Gamify the learning experience. Correct answers award parts, assembling a 3D car model to visualize progress and keep users motivated.',
    image: PlaceHolderImages.find(img => img.id === 'feature-3'),
  },
];

const useCases = [
  {
    icon: <GraduationCap className="h-10 w-10 text-primary" />,
    title: 'Higher Education',
    description: 'Create secure, high-stakes exams for university courses. Prevent cheating and ensure academic integrity with our robust proctoring tools.',
  },
  {
    icon: <Briefcase className="h-10 w-10 text-primary" />,
    title: 'Professional Certification',
    description: 'Deliver industry-standard certification exams with confidence. Our platform ensures a fair and reliable assessment process for all candidates.',
  },
  {
    icon: <Building className="h-10 w-10 text-primary" />,
    title: 'Corporate Training',
    description: 'Assess employee knowledge and skills effectively. Track progress and ensure your team is up-to-date with required training.',
  },
   {
    icon: <BookOpen className="h-10 w-10 text-primary" />,
    title: 'K-12 Education',
    description: 'Engage students with interactive quizzes and gamified learning. Make assessments fun and motivating for younger learners.',
  },
];

const faqs = [
  {
    question: "Is Quizierra secure for high-stakes exams?",
    answer: "Absolutely. We offer advanced, consent-first proctoring, real-time event flagging, and a secure browser environment to ensure the integrity of every exam."
  },
  {
    question: "Can I customize the quizzes?",
    answer: "Yes, Quizierra offers a powerful quiz editor that allows you to create custom questions, set time limits, randomize questions, and much more to fit your specific needs."
  },
  {
    question: "How does the AI hint system work?",
    answer: "Our AI provides contextual hints that guide students toward the correct concept without giving away the answer. It's like having a tutor available 24/7, promoting learning instead of just guessing."
  },
  {
    question: "What is the 3D car gamification feature?",
    answer: "To make learning more engaging, students earn car parts for correct answers. They can then assemble a 3D model of a car, providing a fun, visual representation of their progress and motivating them to keep learning."
  }
];


const heroImage = PlaceHolderImages.find(img => img.id === 'hero-1');

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

const cardVariants = {
  hidden: { y: 50, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10,
    },
  },
};

export default function Home() {
  return (
    <div className="relative isolate flex min-h-screen w-full flex-col">
       <div className="pixel-stars-container">
          <PixelStars />
       </div>
      <Header />
      <main className="flex-1">
      <section className="relative w-full overflow-hidden py-20 md:py-32 lg:py-40">
        <div className="container mx-auto px-4">
          <motion.div 
            className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <motion.h1 variants={itemVariants} className="font-headline text-4xl font-semibold tracking-tighter text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                The Future of <span className="text-primary">Assessment</span> is Here.
              </motion.h1>
              <motion.p variants={itemVariants} className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
                Quizierra is a secure, robust, and engaging platform for modern education and professional certification.
              </motion.p>
              <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="font-semibold">
                  <Link href="/signup">
                    Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="font-semibold">
                  <Link href="#">
                    Request a Demo
                  </Link>
                </Button>
              </motion.div>
            </div>
            <motion.div variants={itemVariants} className="relative mx-auto h-64 w-full max-w-lg lg:h-auto lg:w-full lg:max-w-none lg:aspect-square">
               {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  fill
                  className="rounded-xl object-cover shadow-2xl"
                  data-ai-hint={heroImage.imageHint}
                  priority
                />
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="product" className="w-full bg-background py-20 md:py-24 lg:py-32">
        <div className="container mx-auto grid grid-cols-1 items-center gap-12 px-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7 }}
            className="relative h-80 w-full"
          >
            <Image 
              src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxjb2xsYWJvcmF0aXZlJTIwdGVhbXxlbnwwfHx8fDE3NjU0Mjg3NDd8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Team collaborating on a project"
              fill
              className="rounded-xl object-cover shadow-lg"
              data-ai-hint="collaborative team"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="font-headline text-3xl font-semibold tracking-tighter text-foreground sm:text-4xl md:text-5xl">
              Built for Modern Learning
            </h2>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">
              Quizierra is more than just a quiz tool—it's a comprehensive assessment platform designed for the digital age. We empower educators and trainers to create secure, engaging, and fair evaluations with ease.
            </p>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">
              With AI-powered assistance, deterministic autosave, and gamified progress, we've reimagined what online testing can be.
            </p>
          </motion.div>
        </div>
      </section>

      <section id="features" className="w-full bg-secondary/50 py-20 md:py-24 lg:py-32">
        <div className="container mx-auto px-4">
          <motion.div 
             initial="hidden"
             whileInView="visible"
             viewport={{ once: true, amount: 0.2 }}
             variants={containerVariants}
             className="mb-16 text-center"
          >
            <motion.h2 variants={itemVariants} className="font-headline text-3xl font-semibold tracking-tighter text-foreground sm:text-4xl md:text-5xl">
              A Platform Built for Excellence
            </motion.h2>
            <motion.p variants={itemVariants} className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground md:text-xl">
              From deterministic autosave to AI-powered hints, every feature is designed for reliability and engagement.
            </motion.p>
          </motion.div>
          <motion.div 
            className="grid grid-cols-1 gap-8 md:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={cardVariants}>
                <Card className="flex h-full flex-col overflow-hidden bg-card/80 backdrop-blur-sm transition-shadow duration-300 ease-in-out hover:shadow-xl">
                   <div className="relative aspect-video w-full">
                     {feature.image && (
                       <Image
                        src={feature.image.imageUrl}
                        alt={feature.image.description}
                        fill
                        className="rounded-t-md object-cover"
                        data-ai-hint={feature.image.imageHint}
                        sizes="(max-width: 768px) 100vw, 50vw"
                       />
                     )}
                   </div>
                  <CardHeader className="flex flex-row items-start gap-4">
                    {feature.icon}
                    <div className='flex-1'>
                      <CardTitle className="font-headline text-2xl">{feature.title}</CardTitle>
                      <CardDescription className="mt-2 text-muted-foreground">{feature.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

       <section id="uses" className="w-full bg-background py-20 md:py-24 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="font-headline text-3xl font-semibold tracking-tighter text-foreground sm:text-4xl md:text-5xl">
              Versatile for Any Need
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground md:text-xl">
              Quizierra adapts to your world. Whether for academic exams, professional certifications, or corporate training, our platform delivers.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((useCase) => (
              <motion.div 
                key={useCase.title}
                variants={itemVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >
                <Card className="h-full text-center bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      {useCase.icon}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="text-xl font-semibold">{useCase.title}</h3>
                    <p className="mt-2 text-muted-foreground">{useCase.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="w-full bg-secondary/50 py-20 md:py-24 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="font-headline text-3xl font-semibold tracking-tighter sm:text-4xl md:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground md:text-xl">
              Have questions? We've got answers. Here are some of the most common things we get asked.
            </p>
          </div>
          <div className="mx-auto max-w-4xl">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                 <AccordionItem key={index} value={`item-${index}`}>
                   <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                     {faq.question}
                   </AccordionTrigger>
                   <AccordionContent className="text-base text-muted-foreground">
                     {faq.answer}
                   </AccordionContent>
                 </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="w-full py-20 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 text-center">
           <h2 className="font-headline text-3xl font-semibold tracking-tighter text-foreground sm:text-4xl md:text-5xl">
            Ready to Revolutionize Your Quizzes?
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground md:text-xl">
            Join the growing number of institutions and companies choosing erse.Quizierra for secure, engaging, and effective assessments.
          </p>
          <Button asChild size="lg" className="mt-8 font-semibold">
            <Link href="/signup">
              Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="w-full border-t py-6">
        <div className="container mx-auto flex flex-col items-center justify-between px-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Quizierra. All rights reserved.</p>
          <div className="mt-4 flex gap-4 sm:mt-0">
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </footer>
      </main>
    </div>
  );
}
