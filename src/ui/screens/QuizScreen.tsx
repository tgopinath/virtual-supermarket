import { useEffect, useState } from 'react'
import { DENOMINATIONS } from '../../data/currency'
import { purseTotal } from '../../engine/money'
import { quizDone, useSession } from '../../store/sessionStore'
import { Bar, BuddyBubble, Keypad, ScreenShell } from '../components/Kit'
import { DraggableMoney, MoneyPiece, MoneyTray } from '../components/Money'

const TITLES = { identify: 'Identify Products', prices: 'Learn Prices', totals: 'Calculate Totals', math: 'Maths Challenge', currency: 'Understand Currency', change: 'Calculate Change', money: 'Money Learning' }

export function QuizScreen() {
  const quiz = useSession((s) => s.quiz)
  const { answerQuiz, nextQuestion, goto, quizTrayAdd, quizTrayRemove } = useSession.getState()
  const [typed, setTyped] = useState('')
  useEffect(() => setTyped(''), [quiz?.index])
  if (!quiz) return null
  const q = quiz.questions[quiz.index]
  const done = quizDone(quiz)
  const made = purseTotal(quiz.makeTray)

  return (
    <ScreenShell title={`${TITLES[quiz.kind]}${quiz.level ? ` · Level ${quiz.level}` : ''}`} back={() => window.confirm('Stop this quiz?') && goto(quiz.level ? 'levels' : 'modes')}>
      <div className="mt-4 flex items-center gap-3">
        <span className="font-bold">Question {quiz.index + 1} of {quiz.questions.length}</span>
        <div className="flex-1"><Bar value={(quiz.index + (done ? 1 : 0)) / quiz.questions.length} /></div>
        <span className="flex gap-0.5">{quiz.answers.map((a, i) => <span key={i} className={`h-3 w-3 rounded-full ${a === true ? 'bg-emerald-500' : a === false ? 'bg-rose-400' : 'bg-black/15'}`} />)}</span>
      </div>

      <div className="panel mt-4 p-5 anim-rise" key={q.id}>
        {q.visual?.images && <div className="mb-3 flex flex-wrap justify-center gap-2 text-6xl" aria-hidden>{q.visual.images.map((im, i) => <span key={i}>{im}</span>)}</div>}
        {q.visual?.denomination && <div className="mb-3 flex justify-center"><MoneyPiece value={q.visual.denomination} size={1.6} /></div>}
        <h2 className="text-center text-2xl font-extrabold leading-snug sm:text-3xl">{q.prompt}</h2>

        <div className="mt-5">
          {q.input === 'choice' && (
            <div className="grid gap-2 sm:grid-cols-2">
              {q.choices!.map((c) => {
                const isAnswer = done && c === String(q.answer)
                return (
                  <button key={c} disabled={done} onClick={() => answerQuiz(c)}
                    className={`btn text-xl ${isAnswer ? 'bg-emerald-500 text-white' : 'bg-white ring-1 ring-black/10 hover:bg-orange-50'}`}>{c}</button>
                )
              })}
            </div>
          )}
          {q.input === 'number' && !done && <Keypad value={typed} onChange={setTyped} onSubmit={() => typed && answerQuiz(Number(typed))} />}
          {q.input === 'make-amount' && (
            <div className="space-y-3">
              {/* For change questions the amount is the answer, so the tray must not reveal it. */}
              <MoneyTray purse={quiz.makeTray} dropName="quiz-tray" onRemove={quizTrayRemove}
                label={q.skill === 'change' ? 'Your change' : `Make ₹${q.answer}`}
                highlight={q.skill === 'change' && !done ? null : made === q.answer ? 'ok' : made > Number(q.answer) ? 'bad' : null} />
              <div className="flex flex-wrap justify-center gap-1">
                {DENOMINATIONS.slice().reverse().map((d) => <DraggableMoney key={d} value={d} dropName="quiz-tray" onDrop={quizTrayAdd} disabled={done} size={0.85} />)}
              </div>
              {!done && <button className="btn-green w-full" disabled={!made} onClick={() => answerQuiz(made)}>Check ₹{made}</button>}
            </div>
          )}
        </div>

        {quiz.feedback && (
          <div className={`mt-4 rounded-2xl p-3 text-lg font-bold ${quiz.feedback.correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`} role="status">
            {quiz.feedback.correct ? '🎉 ' : '💡 '}{quiz.feedback.text}
          </div>
        )}
        {done && <button className="btn-primary mt-4 w-full text-2xl" onClick={nextQuestion}>{quiz.index + 1 < quiz.questions.length ? 'Next question →' : 'See my score →'}</button>}
      </div>
      <div className="mt-4"><BuddyBubble /></div>
    </ScreenShell>
  )
}
