"use client"

import { useSession } from "@/lib/auth/client"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useElectricShape } from "@/lib/electric/use-shape"

type SubmissionRow = {
  [key: string]: string | number | boolean | bigint | null
  id: string
  submitter_id: string
  submitter_type: string
  created_at: string
}


export default function PersonalHomePage() {
  const { data: session } = useSession()
  const { data: submissions } = useElectricShape<SubmissionRow>("submissions")

  const mySubmissions = submissions
    .filter(
      (s) =>
        s.submitter_id === session?.user?.id &&
        s.submitter_type === "personal_user",
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

  return (
    <section className="space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">
            Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Your personal SRHR health assessment dashboard.
          </p>
        </hgroup>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild>
            <Link href="/personal/questionnaire">Take Assessment</Link>
          </Button>
          {mySubmissions.length > 0 && (
            <Button variant="outline" asChild>
              <Link href="/personal/result">View Last Result</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assessment History</CardTitle>
        </CardHeader>
        <CardContent>
          {mySubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t taken any assessments yet. Take your first
              assessment to see your SRHR risk profile.
            </p>
          ) : (
            <ul className="space-y-3">
              {mySubmissions.slice(0, 10).map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Assessment #{sub.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant="secondary">Completed</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
