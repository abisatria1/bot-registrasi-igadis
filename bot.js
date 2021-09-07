const puppeteer = require("puppeteer")
const dotenv = require("dotenv").config()
const weekday = new Array(7)
weekday[0] = "Monday"
weekday[1] = "Tuesday"
weekday[2] = "Wednesday"
weekday[3] = "Thursday"
weekday[4] = "Friday"
weekday[5] = "Saturday"
weekday[6] = "Sunday"

// constant
const user = {
  username: process.env.USERNAME_IGRACIAS,
  password: process.env.PASSWORD_IGRACIAS,
  matkulAmbil: {
    tingkat: process.env.MATKUL_AMBIL_TINGKAT,
    namaMatkul: process.env.MATKUL_AMBIL_NAMA,
    kelasMatkul: process.env.MATKUL_AMBIL_KELAS,
  },
  matkulDrop: {
    namaMatkul: process.env.MATKUL_DROP_NAMA,
  },
}

const runBot = async (task) => {
  browser = await puppeteer.launch({
    headless: process.env.HEADLESS == "true" ? true : false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  task.doTask(browser)
}

const chooseCollegeSubjectTask = {
  websiteUrl: "https://igracias.telkomuniversity.ac.id/#",
  registPageurl:
    "https://igracias.telkomuniversity.ac.id/registration/?pageid=761",
  user: { ...user },
  async doTask(browser) {
    try {
      // Initialize New Browser
      const page = await browser.newPage()

      console.log(`go to ${this.websiteUrl}`)
      await page.goto(this.websiteUrl, {
        waitUntil: ["networkidle2", "domcontentloaded"],
      })

      // Insert username
      const username = await page.$("#textUsername")
      await username.type(this.user.username)

      // password
      const pass = await page.$("#textPassword")
      await pass.type(this.user.password)

      // Login Button Click
      console.log(`do login in igracias`)
      await pass.press("Enter")
      page.on("dialog", async (dialog) => {
        await dialog.accept()
      })
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 0 })

      // ke menu registrasi
      // klik tingkat
      let isFull = true
      while (isFull) {
        console.log("going to igracias regist page")
        await page.goto(this.registPageurl, {
          waitUntil: ["networkidle2", "domcontentloaded"],
          timeout: 0,
        })

        console.log("opening subject list tabs")
        await page.waitForSelector(
          `a[href="#ui-tabs-${user.matkulAmbil.tingkat}"]`
        )
        await page.click(`a[href="#ui-tabs-${user.matkulAmbil.tingkat}"]`)
        console.log("waiting for subject row")
        await page.waitForSelector(
          `div#ui-tabs-${this.user.matkulAmbil.tingkat} > table > tbody > tr`
        )
        console.log("droping and insert subject if exist")
        isFull = await page.evaluate(async (user) => {
          return await new Promise(async (resolve) => {
            // <-- return the data to node.js from browser
            let input,
              isFull = false
            $(`div#ui-tabs-${user.matkulAmbil.tingkat}`)
              .find("#table2 tr")
              .has(`td:contains(${user.matkulAmbil.namaMatkul})`)
              .each((idx, item) => {
                // mencari data mata kuliah pada tab
                const search = $(item).find(
                  `td:contains(${user.matkulAmbil.kelasMatkul})`
                )
                if (search.length) {
                  const lastChild = $(item).find("td:last-child")
                  if (lastChild.text() == "") {
                    input = $(lastChild).find("input")
                  } else {
                    isFull = true
                  }
                }
              })

            if (!isFull) {
              input.attr("checked", true)
              if (
                user.matkulDrop.namaMatkul != "" &&
                user.matkulDrop.namaMatkul
              ) {
                // delete matkul pada mata kuliah diambil
                $(`#table_wrapper_registration > table`)
                  .find(`td:contains(${user.matkulDrop.namaMatkul})`)
                  .parent("tr")
                  .find("input")
                  .attr("checked", true)
                $("#deleteTakenCourse").click()
                await new Promise((resolve) => {
                  setTimeout(resolve, 3000)
                })
                $("span.ui-icon-closethick").each((i, item) => $(item).click())
              }

              // check ulang
              $(`div#ui-tabs-${user.matkulAmbil.tingkat}`)
                .find("#table2 tr")
                .has(`td:contains(${user.matkulAmbil.namaMatkul})`)
                .each((idx, item) => {
                  const search = $(item).find(
                    `td:contains(${user.matkulAmbil.kelasMatkul})`
                  )
                  if (search.length) {
                    const lastChild = $(item).find("td:last-child")
                    if (lastChild.text() == "") {
                      input = $(lastChild).find("input")
                    } else {
                      isFull = true
                    }
                  }
                })
              if (!isFull) {
                input.attr("checked", true)
                $("#chooseOfferedCourse").click()
                $("span.ui-icon-closethick").each((i, item) => $(item).click())
              }
            }
            resolve(isFull)
          })
        }, this.user)
        const date = new Date(Date.now())
        const hari = date.getDay().toLocaleString()
        const jam = date.getHours()
        const minute = date.getMinutes()
        const output = `${weekday[hari]}:${jam}:${minute}`
        if (isFull) {
          const string = "Kelas penuh - " + output
          console.log("\x1b[31m%s\x1b[0m", string)
        } else {
          const string = "Berhasil - " + output
          console.log("\x1b[32m%s\x1b[0m", string)
        }
      }
      browser.close()
    } catch (error) {
      console.log(error)
      browser.close()
    }
  },
}

const express = require("express")
const app = express()
const port = process.env.PORT || 3000

app.get("/", async (req, res, next) => {
  await runBot(chooseCollegeSubjectTask)
})

app.listen(port, () => {
  console.log(`app is on ${port}`)
})
