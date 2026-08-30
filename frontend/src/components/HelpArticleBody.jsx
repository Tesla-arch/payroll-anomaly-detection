export default function HelpArticleBody({ article, note }) {
  if (!article) return null

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {note && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">
          {note}
        </p>
      )}
      {article.body.map((block, index) => (
        Array.isArray(block) ? (
          <ol key={index} className="list-decimal space-y-1.5 pl-5">
            {block.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : (
          <p key={index}>{block}</p>
        )
      ))}
    </div>
  )
}
