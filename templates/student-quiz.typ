// Adapted from examy 1.0.0's numbered-question layout and answer-box drawing.

/*
Copyright (c) 2025 Jason Siefken

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

#let answer-box(width: 100%, height: 4cm) = box(
  stroke: 0.5pt,
  width: width,
  height: height,
  inset: 5pt,
)

#let quiz = json("/quiz.json")

#set document(title: quiz.title + " — " + quiz.student)
#set text(font: "DejaVu Serif", size: 11pt)

#set page(
  paper: "us-letter",
  margin: (x: 0.75in, y: 0.8in),
  footer: context align(center, [#counter(page).display("1 / 1", both: true)]),
)

#show raw: set text(font: "DejaVu Sans Mono", size: 9pt)

// Wrap long source lines rather than clipping them at the printable margin.
#show raw: set text(hyphenate: false, overhang: false)
#show raw.line: it => box(width: 100%, it.body)

#let literal(value) = value.split("\n").map(text).join(linebreak())

#align(center, text(size: 18pt, weight: "bold", quiz.title))
#parbreak()

*Student:* #text(quiz.student)
#parbreak()

Write your answers in the spaces provided.
#v(0.5em)

#enum(
  numbering: "1.",
  spacing: 1em,
  ..quiz.questions.map(question => [
    #literal(question.text)

    #if question.code != "" {
      block(
        width: 100%,
        inset: 8pt,
        fill: luma(96%),
        radius: 3pt,
        raw(
          question.code,
          block: true,
          lang: quiz.language,
        ),
      )
    }

    #answer-box()
  ]),
)
