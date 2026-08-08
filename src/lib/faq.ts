export interface FaqItem {
  question: string
  answer: string
}

export interface FaqSection {
  title: string
  items: FaqItem[]
}

// ST-020 (B5. Help Center & Support — "FAQ search returns relevant
// results"). Extracted from the previously hardcoded /help JSX so
// FaqSearch has something to filter over — the copy itself is unchanged.
// Topic tiles on /help jump to a section further down the same page. Deriving
// the anchor here means the tile and the heading cannot disagree — computing
// it in both places would drift the first time a section title changes.
export function faqSectionAnchorId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `faq-${slug}`
}

export function searchFaq(sections: FaqSection[], query: string): FaqSection[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return sections

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.question.toLowerCase().includes(trimmed) ||
          item.answer.toLowerCase().includes(trimmed)
      ),
    }))
    .filter((section) => section.items.length > 0)
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    title: 'Ordering & Prescriptions',
    items: [
      {
        question: 'Do I need a prescription to order?',
        answer:
          'Most of our frames require a valid prescription from a licensed eye care professional. Upload it from your account dashboard and wait for one of our optometrists to verify it — verification has to be complete before you place an order containing prescription eyewear.',
      },
      {
        question: 'How do I upload my prescription?',
        answer:
          'Go to My Account → My Prescriptions and upload a clear photo or PDF. We accept JPG, PNG, and PDF files. Do this before you order prescription eyewear, since checkout requires a verified prescription already on file.',
      },
      {
        question: 'How long does prescription verification take?',
        answer:
          "Our licensed optometrists review every prescription within 12 hours. You'll receive an email as soon as your prescription is verified.",
      },
      {
        question: 'My prescription was rejected — what do I do?',
        answer:
          "We'll email you to let you know. The most common causes are an illegible photo or an expired prescription — re-upload a clearer copy from your account dashboard, or email support@visionnova.com if you'd like to know exactly why it was rejected.",
      },
    ],
  },
  {
    title: 'Shipping & Delivery',
    items: [
      {
        question: 'How long does delivery take?',
        answer: 'Standard delivery within India takes 5–7 business days after your prescription is verified.',
      },
      {
        question: 'Can I track my order?',
        answer:
          'Yes. We email you when your order ships, and you can follow its progress any time under My Account → Orders, which shows the carrier and tracking number once your order is dispatched.',
      },
    ],
  },
  {
    title: 'Returns & Refunds',
    items: [
      {
        question: 'What is your return policy?',
        answer:
          '30-day returns on non-prescription frames, 14-day returns on prescription glasses. Items must be in original condition with original packaging.',
      },
      {
        question: 'How do I start a return?',
        answer:
          'Email us at support@visionnova.com with your order number, within 30 days for non-prescription frames or 14 days for prescription glasses. Our team will confirm your return and arrange collection with you directly.',
      },
      {
        question: 'When will I receive my refund?',
        answer: 'Refunds are processed within 5–7 business days of receiving your returned item.',
      },
    ],
  },
  {
    title: 'Payments',
    items: [
      {
        question: 'What payment methods can I use?',
        answer:
          'Orders within India are handled by Razorpay, and prices are charged in rupees. The payment options available to you appear in the Razorpay window when you check out.',
      },
      {
        question: 'Is my payment information secure?',
        answer:
          "Card and bank details are entered with our payment provider and never reach VisionNova's servers, so we never store them. We also verify every payment directly with the provider using a signed message before marking an order paid — an order is never treated as paid on the word of your browser alone.",
      },
      {
        question: 'When am I charged?',
        answer:
          'When you complete payment at checkout. If a payment fails, your order is kept unpaid and nothing is taken. Refunds on returned items are processed within 5–7 business days.',
      },
    ],
  },
  {
    title: 'Privacy & Account',
    items: [
      {
        question: 'Is my prescription data secure?',
        answer:
          'Yes. Your prescription is only accessible to you and our licensed optometrists, and every access is logged. We never share your medical information with third parties.',
      },
    ],
  },
]
