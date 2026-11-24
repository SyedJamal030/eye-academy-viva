import { useCallback, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import Alert from 'react-bootstrap/Alert'
import Container from 'react-bootstrap/Container'
import { ExaminerTurnControls } from '#/components/ExaminerTurnControls'
import { FindingsBoard } from '#/components/FindingsBoard'
import { PatientCaseCard } from '#/components/PatientCaseCard'
import { RevisionCard } from '#/components/RevisionCard'
import { TranscriptPanel } from '#/components/TranscriptPanel'
import { TurnIndicator } from '#/components/TurnIndicator'
import { VivaHeader } from '#/components/VivaHeader'
import { VivaSidebar } from '#/components/VivaSidebar'
import rawCaseData from '#/data/case-ea-viva-001.json'
import { useAttemptSelection } from '#/hooks/useAttemptSelection'
import { useAuth } from '#/hooks/useAuth'
import {
  useActiveAttemptQuery,
  useCreateAttemptMutation,
  useGenerateRevisionMutation,
  useProcessVivaTurnMutation,
  useUserAttemptsQuery,
} from '#/hooks/useVivaQueries'
import { useVivaTurnController } from '#/hooks/useVivaTurnController'
import { getAllCaseFindings } from '#/lib/findings'
import type { VivaCaseData } from '#/types/viva'

const caseData = rawCaseData as VivaCaseData

export const Route = createFileRoute('/')({
  component: VivaHomePage,
})

function VivaHomePage() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const uid = user?.uid ?? null
  const allFindings = useMemo(() => getAllCaseFindings(), [])

  const attemptsQuery = useUserAttemptsQuery(uid)
  const createAttemptMutation = useCreateAttemptMutation(uid)
  const processTurnMutation = useProcessVivaTurnMutation(uid)
  const generateRevisionMutation = useGenerateRevisionMutation(uid)

  const existingList = attemptsQuery.data ?? []

  const clearPageError = useCallback(() => {
    setPageError(null)
  }, [])

  const { resolvedAttemptId, selectAttempt, handleNewAttempt } =
    useAttemptSelection({
      caseData,
      attempts: existingList,
      isLoadingAttempts: attemptsQuery.isLoading,
      isCreatingAttempt: createAttemptMutation.isPending,
      createAttempt: createAttemptMutation.mutateAsync,
      onError: setPageError,
    })

  const activeAttemptQuery = useActiveAttemptQuery(uid, resolvedAttemptId)
  const activeAttempt =
    activeAttemptQuery.data ??
    existingList.find((a) => a.id === resolvedAttemptId) ??
    null

  const {
    typedInput,
    setTypedInput,
    speechError,
    isBusy,
    voice,
    autoListen,
    setAutoListen,
    handleTextSubmit,
  } = useVivaTurnController({
    activeAttempt,
    isProcessingTurn: processTurnMutation.isPending,
    processTurn: processTurnMutation.mutateAsync,
    onClearPageError: clearPageError,
  })

  const handleGenerateRevision = useCallback(async () => {
    if (!activeAttempt || generateRevisionMutation.isPending) return
    setPageError(null)

    try {
      await generateRevisionMutation.mutateAsync({
        attempt: activeAttempt,
      })
    } catch (err) {
      setPageError(
        err instanceof Error
          ? err.message
          : 'Failed to generate revision point.',
      )
    }
  }, [activeAttempt, generateRevisionMutation])

  const combinedError =
    pageError ??
    speechError ??
    voice.voiceError ??
    (processTurnMutation.error instanceof Error
      ? processTurnMutation.error.message
      : null) ??
    (generateRevisionMutation.error instanceof Error
      ? generateRevisionMutation.error.message
      : null)

  return (
    <div className="min-vh-100 d-flex bg-light text-dark">
      <VivaSidebar
        isOpen={sidebarOpen}
        isLoadingAttempts={attemptsQuery.isLoading}
        isCreatingAttempt={createAttemptMutation.isPending}
        attempts={existingList}
        activeAttemptId={activeAttempt?.id ?? null}
        onNewAttempt={() => void handleNewAttempt()}
        onSelectAttempt={selectAttempt}
      />

      <div className="flex-1 d-flex flex-column min-w-0 w-100">
        <VivaHeader
          sidebarOpen={sidebarOpen}
          caseId={caseData.case_id}
          title={caseData.title}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <Container as="main" className="py-4" style={{ maxWidth: '56rem' }}>
          <div className="d-flex flex-column gap-3">
            <PatientCaseCard caseData={caseData} />

            <ExaminerTurnControls
              phase={voice.phase}
              liveTranscript={voice.liveTranscript}
              typedInput={typedInput}
              isBusy={isBusy}
              hasActiveAttempt={Boolean(activeAttempt)}
              autoListen={autoListen}
              onAutoListenChange={setAutoListen}
              onStartListening={voice.startListening}
              onStopListening={voice.stopListening}
              onTypedInputChange={setTypedInput}
              onSubmit={handleTextSubmit}
            />

            <TurnIndicator phase={voice.phase} lastTurnMs={voice.lastTurnMs} />

            {combinedError && (
              <Alert
                variant="danger"
                className="mb-0 py-2 px-3 small"
                role="alert"
              >
                {combinedError}
              </Alert>
            )}

            <TranscriptPanel messages={activeAttempt?.messages} />

            <FindingsBoard
              allFindings={allFindings}
              revealedIds={activeAttempt?.revealedFindingIds ?? []}
            />

            <RevisionCard
              revision={activeAttempt?.revisionPoint}
              onGenerate={() => void handleGenerateRevision()}
              loading={generateRevisionMutation.isPending}
            />
          </div>
        </Container>
      </div>
    </div>
  )
}
