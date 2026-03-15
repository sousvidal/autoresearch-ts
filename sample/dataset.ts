export interface Example {
  text: string;
  label: "positive" | "negative";
}

/**
 * Movie review sentiment examples.
 * First 20: available for few-shot prompting.
 * Remaining 40: held-out evaluation set.
 */
export const fewShotExamples: Example[] = [
  { text: "A beautifully crafted film with stunning performances that stay with you long after the credits roll.", label: "positive" },
  { text: "This movie is a complete waste of time. The plot makes no sense and the acting is wooden.", label: "negative" },
  { text: "An absolute masterpiece of storytelling. Every scene is perfectly paced and deeply moving.", label: "positive" },
  { text: "Dull, predictable, and painfully long. I couldn't wait for it to end.", label: "negative" },
  { text: "The chemistry between the leads is electric, making this romantic comedy a genuine delight.", label: "positive" },
  { text: "Terrible dialogue, lazy writing, and special effects that look like they're from the 90s.", label: "negative" },
  { text: "A refreshing take on the genre with clever writing and a twist ending that actually works.", label: "positive" },
  { text: "I've never been so bored watching an action movie. Zero tension, zero stakes.", label: "negative" },
  { text: "The director's vision shines through every frame. This is cinema at its finest.", label: "positive" },
  { text: "An incoherent mess that tries to be deep but ends up being pretentious and hollow.", label: "negative" },
  { text: "Laugh-out-loud funny with a surprisingly heartfelt core. Best comedy of the year.", label: "positive" },
  { text: "The sequel nobody asked for and nobody needed. Adds nothing to the original.", label: "negative" },
  { text: "A gripping thriller that keeps you guessing until the very last minute.", label: "positive" },
  { text: "So formulaic it hurts. You can predict every beat from the trailer alone.", label: "negative" },
  { text: "The soundtrack alone is worth the price of admission. Hauntingly beautiful.", label: "positive" },
  { text: "Offensive, tone-deaf, and not even remotely funny despite billing itself as a comedy.", label: "negative" },
  { text: "A triumphant return to form for the director. Bold, inventive, and deeply human.", label: "positive" },
  { text: "The child actors carry this film better than the overpaid adult leads ever could.", label: "positive" },
  { text: "Started strong but completely falls apart in the third act. What a disappointment.", label: "negative" },
  { text: "One of those rare films that gets better every time you watch it. An instant classic.", label: "positive" },
];

export const evalExamples: Example[] = [
  { text: "A visually stunning epic that balances spectacle with genuine emotional depth.", label: "positive" },
  { text: "Clumsy exposition dumps and a hero with the charisma of wet cardboard.", label: "negative" },
  { text: "The ensemble cast delivers pitch-perfect performances across the board.", label: "positive" },
  { text: "Drags on for nearly three hours with barely enough plot for ninety minutes.", label: "negative" },
  { text: "Smart, witty, and endlessly rewatchable. A new favorite in my collection.", label: "positive" },
  { text: "The CGI is so bad it's distracting. Hard to take any scene seriously.", label: "negative" },
  { text: "A touching portrayal of family bonds that will make even the toughest viewer tear up.", label: "positive" },
  { text: "Tries way too hard to be edgy and ends up just being uncomfortable to watch.", label: "negative" },
  { text: "Every element works in perfect harmony — script, direction, acting, score.", label: "positive" },
  { text: "A shameless cash grab that disrespects everything fans loved about the original.", label: "negative" },
  { text: "The subtle humor and clever dialogue elevate what could have been a standard rom-com.", label: "positive" },
  { text: "Loud, mindless, and exhausting. My ears are still ringing from the unnecessary explosions.", label: "negative" },
  { text: "A slow burn that rewards patient viewers with a devastating and cathartic final act.", label: "positive" },
  { text: "The twist is so obvious I called it in the first ten minutes.", label: "negative" },
  { text: "Gorgeous cinematography captures the landscape as if it were a character in the story.", label: "positive" },
  { text: "Not a single likeable character in the entire film. Who am I supposed to root for?", label: "negative" },
  { text: "The documentary approach adds a layer of authenticity that makes every moment feel real.", label: "positive" },
  { text: "A bloated, self-indulgent vanity project that should have been reined in by a producer.", label: "negative" },
  { text: "Brilliantly subverts genre expectations while still delivering satisfying entertainment.", label: "positive" },
  { text: "The villain's motivation is laughably thin. Even the actor seems embarrassed.", label: "negative" },
  { text: "An uplifting story about resilience that never feels manipulative or saccharine.", label: "positive" },
  { text: "So derivative it borders on plagiarism. I've seen this exact movie ten times before.", label: "negative" },
  { text: "The breakout performance from the lead announces a major new talent in Hollywood.", label: "positive" },
  { text: "Choppy editing makes it impossible to follow what should be straightforward action scenes.", label: "negative" },
  { text: "Manages to be both hilariously funny and deeply poignant without either feeling forced.", label: "positive" },
  { text: "The musical numbers feel shoehorned in and grind the narrative to a halt every time.", label: "negative" },
  { text: "A masterclass in tension building. I was literally on the edge of my seat.", label: "positive" },
  { text: "Painfully unfunny jokes delivered with the timing of a broken metronome.", label: "negative" },
  { text: "The world-building is immersive and detailed without ever overwhelming the central story.", label: "positive" },
  { text: "Relies entirely on jump scares with no atmosphere or genuine dread whatsoever.", label: "negative" },
  { text: "An intimate character study that finds extraordinary drama in ordinary life.", label: "positive" },
  { text: "The romantic subplot feels forced and adds absolutely nothing to the main plot.", label: "negative" },
  { text: "Ambitious in scope and flawless in execution. One of the year's best films.", label: "positive" },
  { text: "A cynical, paint-by-numbers sequel designed solely to sell merchandise.", label: "negative" },
  { text: "The final twenty minutes are some of the most powerful cinema I've ever experienced.", label: "positive" },
  { text: "Flat lighting, bland sets, and costumes that look like they came from a Halloween store.", label: "negative" },
  { text: "An unexpected gem that proves you don't need a massive budget to tell a great story.", label: "positive" },
  { text: "The plot holes are so massive you could drive a truck through them.", label: "negative" },
  { text: "Perfect pacing, not a single wasted scene. Tight, efficient filmmaking at its best.", label: "positive" },
  { text: "An absolute chore to sit through. I checked my watch at least a dozen times.", label: "negative" },
];
