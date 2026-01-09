import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

interface MarkdownRendererProps {
	content: string;
	className?: string;
	telegramStyle?: boolean; // When true, *text* renders as bold (Telegram style)
}

export function MarkdownRenderer({
	content,
	className = "",
	telegramStyle = true,
}: MarkdownRendererProps) {
	return (
		<div className={className}>
			<ReactMarkdown
				remarkPlugins={[remarkBreaks]}
				components={{
					// Customize paragraph rendering
					p: ({ children }) => <p className="mb-2">{children}</p>,
					// Conditional rendering based on style
					...(telegramStyle
						? {
								// Telegram style: *text* and **text** both render as bold
								em: ({ children }) => <strong>{children}</strong>,
								strong: ({ children }) => <strong>{children}</strong>,
							}
						: {
								// Default markdown style: *text* is italic, **text** is bold
								em: ({ children }) => <em>{children}</em>,
								strong: ({ children }) => <strong>{children}</strong>,
							}),
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
