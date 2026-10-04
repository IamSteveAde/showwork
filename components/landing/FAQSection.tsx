import { ArrowUpRight, MessageCircle, Plus } from "lucide-react";

const questions = [
  {
    question: "What can I do with Showwork?",
    answer: "Showwork brings your creative client work together. Build a portfolio to showcase your work, deliver projects through shareable links, and use Content Workspace to organize ongoing client content, approvals, conversations, leads and analytics.",
  },
  {
    question: "Can I get started for free?",
    answer: "Yes. Your portfolio is free, and the free Project Delivery plan includes one project per 30 days. Content Workspace comes with 7 days of full Agency feature access, whichever plan you intend to choose. When you need more capacity, choose a paid plan from the pricing section above.",
  },
  {
    question: "Who is Showwork built for?",
    answer: "Showwork is built for independent creators, photographers, videographers, designers, creative agencies and social media teams. Whether you are sharing your first portfolio or managing ongoing client accounts, you can start with the tools that fit your work.",
  },
  {
    question: "How do I share finished work with a client?",
    answer: "Create a delivery project, add your files and share the project link with your client. It gives your work a dedicated presentation page and keeps the delivery organized in one place.",
  },
  {
    question: "How is Content Workspace different from Project Delivery?",
    answer: "Project Delivery is for presenting and handing over individual projects. Content Workspace is for ongoing client accounts: plan content, manage feedback and approvals, collaborate with your team, and keep track of conversations, leads and performance.",
  },
  {
    question: "Do I need to know how to code to create a portfolio?",
    answer: "No coding is needed. Add your details, organize your work into sections and publish your portfolio. Showwork handles the presentation so you can focus on the work you want people to see.",
  },
];

export default function FAQSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-24 border-t border-[#E5E7EB] bg-[#F4F5F7] px-5 py-24 text-[#111317] sm:px-8 sm:py-32 lg:px-16"
    >
      <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <div>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#2478FF]">
            <span aria-hidden="true" className="h-px w-8 bg-current" />
            A little clarity
          </p>
          <h2 id="faq-heading" className="mt-6 font-[var(--font-fraunces)] text-[clamp(3rem,5vw,5.5rem)] font-normal leading-[0.98] tracking-[-0.055em]">
            Good questions.
            <br />
            <span className="text-[#2478FF]">Clear answers.</span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-7 text-[#626974]">
            Everything you need to know before giving your work a new home.
          </p>
          <div className="mt-10 max-w-sm rounded-2xl border border-[#E1E5EC] bg-white/70 p-6">
            <MessageCircle aria-hidden="true" size={22} className="text-[#2478FF]" />
            <h3 className="mt-4 text-sm font-semibold">Still have a question?</h3>
            <p className="mt-2 text-sm leading-6 text-[#626974]">Let’s talk about what you’re working on.</p>
            <a href="mailto:hello@useshowwork.com" className="mt-4 inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-[#2478FF] transition-colors hover:text-[#0052FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2478FF]">
              Get in touch <ArrowUpRight aria-hidden="true" size={16} />
            </a>
          </div>
        </div>

        <div className="space-y-3">
          {questions.map(({ question, answer }, index) => (
            <details key={question} open={index === 0} className="group rounded-2xl border border-[#E1E5EC] bg-white transition-colors open:border-[#2478FF]/30 open:bg-[#EEF4FF]">
              <summary className="flex cursor-pointer list-none items-center gap-4 rounded-2xl px-5 py-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2478FF] sm:px-7 [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="hidden text-xs font-medium tabular-nums text-[#7A8290] sm:block">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="flex-1 text-sm font-semibold leading-6 sm:text-base">{question}</h3>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4F5F7] text-[#626974] transition-colors group-hover:bg-[#E5EDFC] group-open:bg-[#2478FF] group-open:text-white">
                  <Plus aria-hidden="true" size={16} className="transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" />
                </span>
              </summary>
              <p className="px-5 pb-7 text-sm leading-7 text-[#535C69] sm:pl-[4.75rem] sm:pr-16">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
