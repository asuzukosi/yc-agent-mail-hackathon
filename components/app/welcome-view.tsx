import { Button } from '@/components/livekit/button';
import Image from 'next/image';

function WelcomeImage() {
  return (
    <div className="mb-4 flex justify-center">
      <Image
        src="/ithinkilovemyjob.png"
        alt="I think I love my job! 😭"
        width={128}
        height={128}
        className="h-auto max-h-32 w-auto"
      />
    </div>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref}>
      <section className="bg-background flex flex-col items-center justify-center text-center">
        <WelcomeImage />

        <p className="text-foreground max-w-prose pt-1 leading-6 font-medium text-lg">
          Start a voice AI meeting with your recruitment agent 😈
        </p>

        <Button variant="primary" size="lg" onClick={onStartCall} className="mt-6 w-64 font-mono">
          {startButtonText}
        </Button>
      </section>
    </div>
  );
};

