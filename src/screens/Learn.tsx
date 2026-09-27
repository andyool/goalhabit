import { Check, Clock } from "lucide-react";
import { useEffect } from "react";
import { Badge, Button, Card, EmptyState, List, PageHeader, Row } from "../components/ui";
import { LESSONS } from "../lib/content";
import { useStore } from "../lib/store";
import { goBack, navigate, toast } from "../lib/ui";

export function Learn() {
  const read = useStore((s) => s.lessonsRead);
  return (
    <div>
      <PageHeader title="Learn" subtitle="Research" back={{ name: "profile" }} />
      <p className="-mt-2 mb-5 text-sm text-fg-2">Short, practical lessons on discipline and habit science. {read.length}/{LESSONS.length} read.</p>
      <List>
        {LESSONS.map((l) => (
          <Row key={l.id} onClick={() => navigate({ name: "lesson", id: l.id })}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-card-2 text-2xl">{l.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium leading-snug">{l.title}</div>
              <div className="truncate text-xs text-fg-3">{l.summary}</div>
            </div>
            {read.includes(l.id) ? (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-good/15 text-good">
                <Check size={14} strokeWidth={3} />
              </span>
            ) : (
              <span className="shrink-0 text-xs text-fg-3">{l.minutes} min</span>
            )}
          </Row>
        ))}
      </List>
    </div>
  );
}

export function Lesson({ id }: { id: string }) {
  const lesson = LESSONS.find((l) => l.id === id);
  const read = useStore((s) => s.lessonsRead.includes(id));
  const markRead = useStore((s) => s.markLessonRead);
  useEffect(() => window.scrollTo({ top: 0 }), [id]);
  if (!lesson) return <EmptyState icon="📭" title="Lesson not found" body="" />;
  const idx = LESSONS.indexOf(lesson);
  const next = LESSONS[idx + 1];
  return (
    <div>
      <PageHeader title={lesson.title} back={{ name: "learn" }} large={false} />
      <div className="-mt-3 mb-5 flex items-center gap-2">
        <Badge>
          <Clock size={10} /> {lesson.minutes} min read
        </Badge>
        {read && <Badge tone="good">Read</Badge>}
      </div>
      <div className="mb-6 text-5xl">{lesson.emoji}</div>
      <div className="space-y-4 text-[16px] leading-relaxed text-fg-2">
        {lesson.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <Card className="mt-6 p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent-2">Key takeaways</div>
        <ul className="space-y-2.5">
          {lesson.takeaways.map((t) => (
            <li key={t} className="flex gap-2.5 text-sm">
              <Check size={16} className="mt-0.5 shrink-0 text-accent-2" /> {t}
            </li>
          ))}
        </ul>
      </Card>
      <div className="mt-6 space-y-2">
        {!read && (
          <Button
            full
            size="lg"
            onClick={() => {
              markRead(lesson.id);
              toast("Lesson complete · +25 XP", "good");
              if (next) navigate({ name: "lesson", id: next.id }, { replace: true });
              else goBack({ name: "learn" });
            }}
          >
            Mark as read{next ? " · next lesson" : ""}
          </Button>
        )}
        {read && next && (
          <Button full size="lg" variant="secondary" onClick={() => navigate({ name: "lesson", id: next.id }, { replace: true })}>
            Next: {next.title}
          </Button>
        )}
      </div>
    </div>
  );
}
