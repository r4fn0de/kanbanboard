import { Button } from '@/components/ui/button'
import { ArrowRight, Plus, Users, Target, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  accentIndex 
}: { 
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  accentIndex: number
}) {
  const accentThemes = [
    {
      dot: "bg-gray-400",
      accentBorder: "border-gray-200 dark:border-gray-700",
      gradient: "",
    },
    {
      dot: "bg-gray-500",
      accentBorder: "border-gray-200 dark:border-gray-700",
      gradient: "",
    },
    {
      dot: "bg-gray-600",
      accentBorder: "border-gray-200 dark:border-gray-700",
      gradient: "",
    },
    {
      dot: "bg-gray-700",
      accentBorder: "border-gray-200 dark:border-gray-700",
      gradient: "",
    },
  ] as const;

  const theme = accentThemes[accentIndex % accentThemes.length] ?? accentThemes[0];

  return (
    <div className={cn(
      "flex flex-col gap-5 rounded-[32px] border border-gray-200 bg-white p-6 transition-all duration-200 hover:scale-[1.02] dark:border-gray-700 dark:bg-gray-900",
      theme.accentBorder
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800",
          theme.dot
        )}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function HomeWelcome() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome to Kanbanboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize your work, keep projects on track, and stay focused
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link to="/boards" className="flex items-center gap-2">
              <span>Go to Boards</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/projects/all">Browse Projects</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 auto-rows-[minmax(200px,auto)]">
        {/* Large card - spans 2 columns on md+ */}
        <div className="md:col-span-2 lg:col-span-2">
          <FeatureCard
            icon={Plus}
            title="Capture work fast"
            description="Create boards for products, teams, or personal goals. Each card keeps the context you need right where you need it. Start organizing your workflow with our intuitive interface."
            accentIndex={0}
          />
        </div>

        {/* Medium card */}
        <div className="md:col-span-1 lg:col-span-1">
          <FeatureCard
            icon={Target}
            title="Focus on priorities"
            description="View favorite projects, track deadlines, and spot blockers early so the team stays aligned."
            accentIndex={1}
          />
        </div>

        {/* Small card */}
        <div className="md:col-span-1 lg:col-span-1 md:row-span-2">
          <FeatureCard
            icon={Users}
            title="Collaborate effectively"
            description="Share boards with your team, assign tasks, and keep everyone in sync with real-time updates. Work together seamlessly."
            accentIndex={2}
          />
        </div>

        {/* Medium card */}
        <div className="md:col-span-1 lg:col-span-1">
          <FeatureCard
            icon={Zap}
            title="Work efficiently"
            description="Drag and drop cards, set up automation rules, and customize workflows to match your process."
            accentIndex={3}
          />
        </div>

        {/* Medium card - spans 2 columns on lg */}
        <div className="md:col-span-2 lg:col-span-2">
          <FeatureCard
            icon={Target}
            title="Stay organized"
            description="Keep track of all your projects in one place. Filter, search, and organize your work with powerful tools designed for modern teams."
            accentIndex={0}
          />
        </div>
      </div>
    </div>
  )
}

export default HomeWelcome
