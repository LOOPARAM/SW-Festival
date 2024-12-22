"use client";

import { SetStateAction, useEffect, useState } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db, editSubjectScore, Login, Logout, checkAuthState, deleteSubjectScore } from "../components/firebase";
import { User } from "firebase/auth";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [grade, setGrade] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);
  const [examType, setExamType] = useState<number>(1);
  const [subjects, setSubjects] = useState<
    {
      name: string;
      participant: number;
      gradeCutoffs: { [grade: number]: { cutoff: number; range: string } };
    }[]
  >([]);
  const [updatedScores, setUpdatedScores] = useState<{ [key: string]: string | number }>({});

  const [selectedGrades] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  const [isSliding, setIsSliding] = useState(false); // 슬라이드 상태 관리

  const handleSlide = async () => {
    if (isSliding === false) {
      if (!user) {
        try {
          Login((loggedInUser:User) => {
            if (loggedInUser) {
              setUser(loggedInUser);
              if (
                loggedInUser.email?.split("@")[1] === "kyungheeboy.hs.kr" &&
                year - parseInt(loggedInUser.email.split("@")[0].split("-")[0]) - 1999 <= 3 &&
                year - parseInt(loggedInUser.email.split("@")[0].split("-")[0]) - 1999 >= 1
              ) {
                setIsSliding(true); // 슬라이드 전환
              fetchUserScores(loggedInUser);
              } else {
                alert(
                  `${year}년 ${grade}학년 ${semester}학기 ${examType === 1 ? "중간" : "기말"
                  }고사 성적 반영에 적합하지 못한 사용자입니다.`
                );
              }
            }
          });
        } catch (error) {
          console.error("Login failed:", error);
        }
      } else {
        if (
          user.email?.split("@")[1] === "kyungheeboy.hs.kr" &&
          year - parseInt(user.email.split("@")[0].split("-")[0]) - 1999 <= 3 &&
          year - parseInt(user.email.split("@")[0].split("-")[0]) - 1999 >= 1
        ) {
          setIsSliding(true); // 슬라이드 전환
          await fetchUserScores(user);
        } else {
          alert(
            `${year}년 ${grade}학년 ${semester}학기 ${examType === 1 ? "중간" : "기말"
            }고사 성적 반영에 적합하지 못한 사용자입니다.`
          );
        }
      }
    } else {
      setIsSliding(false);
    }
  };

  const fetchUserScores = async (user_: User) => {
    try {
      const gradeSemester = `${grade}-${semester}-${examType}`;
      const userEmail = user_?.email?.split("@")[0]; // 사용자 이메일에서 ID 추출
      const scores: { [key: string]: number } = {}; // 키는 문자열, 값은 숫자

      for (const subject of subjects) {
        const yearCollection = collection(db, gradeSemester, subject.name, String(year));
        const snapshot = await getDocs(yearCollection);

        snapshot.forEach((doc) => {
          //console.log(subject.name ,doc.data().id, userEmail);
          if (doc.data().id === userEmail) {
            scores[subject.name] = doc.data().score;
          }
        });
      }

      setUpdatedScores(scores); // 가져온 점수를 상태에 반영
      //console.log("사용자 성적 데이터:", scores);
    } catch (error) {
      console.error("사용자 성적 데이터를 가져오는 중 오류 발생:", error);
    }
  };

  useEffect(() => {
    // Firebase 인증 상태 감지
    checkAuthState((user_: SetStateAction<User | null>) => {
      setUser(user_); // 로그인 상태 업데이트
    });
  }, []);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const gradeSemester = `${grade}-${semester}-${examType}`;
        const subjectsCollection = collection(db, gradeSemester);
        const snapshot = await getDocs(subjectsCollection);

        const fetchedSubjects = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const subject = docSnap.id;
            const yearCollection = collection(db, gradeSemester, subject, String(year));
            const yearSnapshot = await getDocs(yearCollection);

            if (!yearSnapshot.empty) {
              const scores = yearSnapshot.docs.map((doc) => doc.data().score);
              const gradeCutoffs = calculateGradeCutoffs(scores);

              return {
                name: subject,
                participant: yearSnapshot.docs.length,
                gradeCutoffs,
              };
            }
            return null;
          })
        );

        setSubjects(fetchedSubjects.filter((subject) => subject !== null));
      } catch (error) {
        if (error instanceof Error) {
          //console.error("과목 데이터를 가져오는 중 오류 발생:", error.message);
        } else {
          //console.error("과목 데이터를 가져오는 중 알 수 없는 오류 발생:", error);
        }
      }
    }

    fetchSubjects();
  }, [grade, semester, year, examType, isSliding]);


  function calculateGradeCutoffs(scores: number[]): { [grade: number]: { cutoff: number; range: string } } {
    const sortedScores = [...scores].sort((a, b) => b - a);
    const totalScores = sortedScores.length;
    const gradePercentiles = {
      1: 4 / 100,
      2: 11 / 100,
      3: 23 / 100,
      4: 40 / 100,
      5: 60 / 100,
      6: 77 / 100,
      7: 89 / 100,
      8: 96 / 100,
      9: 100 / 100,
    };

    const gradeCutoffs: { [grade: number]: { cutoff: number; range: string } } = {};
    let previousCutoffIndex = 0;

    Object.entries(gradePercentiles).forEach(([key, value]) => {
      const grade = parseInt(key);
      const cutoffIndex = Math.ceil(totalScores * value) - 1;
      const startRank = previousCutoffIndex + 1;
      const endRank = cutoffIndex + 1;

      gradeCutoffs[grade] = {
        cutoff: sortedScores[cutoffIndex] || 0,
        range: `${startRank} ~ ${endRank}`,
      };

      previousCutoffIndex = cutoffIndex;
    });

    return gradeCutoffs;
  }

  return (
    <div
      className={"relative w-full h-screen bg-gradient-to-br from-green-400 to-blue-600 text-black flex flex-col overflow-hidden justify-center"}>
      <h1 className="w-full h-[20vh] text-center font-black flex flex-col justify-center text-5xl sm:text-7xl md:text-8xl lg:text-8xl">
        내신 등급컷 예측기
      </h1>
      {/* 1번째 화면 */}
      <div className={`w-full h-[70vh] transition-transform duration-500 ${isSliding ? "-translate-x-full" : "translate-x-0"}`}>
        <div className="mb-4 flex flex-wrap items-center justify-center gap-4">
          {[
            {
              id: "year",
              //label: "연도 선택",
              value: year,
              options: [...Array(5)].map((_, i) => new Date().getFullYear() - i),
              onChange: (value: number) => setYear(value),
            },
            {
              id: "grade",
              //label: "학년 선택",
              value: grade,
              options: [
                { value: 1, label: "1학년" },
                { value: 2, label: "2학년" },
                { value: 3, label: "3학년" }
              ],
              onChange: (value: number) => setGrade(value),
            },
            {
              id: "semester",
              //label: "학기 선택",
              value: semester,
              options: [
                { value: 1, label: "1학기" },
                { value: 2, label: "2학기" }
              ],
              onChange: (value: number) => setSemester(value),
            },
            {
              id: "examType",
              //label: "시험 선택",
              value: examType,
              options: [
                { value: 1, label: "중간고사" },
                { value: 2, label: "기말고사" },
              ],
              onChange: (value: number) => setExamType(value),
            },
          ].map(({ id, value, options, onChange }) => (
            <div key={id} className="flex flex-col items-center text-center">
              {/* <label htmlFor={id} className="block text-sm font-medium text-black">
                {label}
              </label> */}
              <select
                id={id}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="mt-1 block w-full py-1 px-2 border border-gray-800 bg-gray-800 bg-opacity-70 text-white rounded-md shadow-sm 
                                       focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {Array.isArray(options)
                  ? options.map((option) =>
                    typeof option === "object" ? (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ) : (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    )
                  )
                  : null}
              </select>
            </div>
          ))}
        </div>
        <div className="mb-6 text-center">
          <button onClick={handleSlide} className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-500 to-pink-500 group-hover:from-purple-500 group-hover:to-pink-500 hover:text-white dark:text-white">
            <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
              내 성적 입력
            </span>
          </button>
        </div>
        <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 flex justify-center">
          <div className="relative inline-block overflow-x-auto overflow-y-auto max-h-[55vh] shadow-md rounded-lg">
            <table className="table-auto w-full min-w-[1300px] border-collapse text-sm text-left rtl:text-right text-gray-300">
              <thead className="text-xs text-gray-200 uppercase bg-gray-900  bg-opacity-80">
                <tr>
                  <th className="px-6 py-3">과목</th>
                  <th className="px-2 py-3">참여자 수</th>
                  {selectedGrades.map((grade) => (
                    <th key={grade} className="px-2 py-3">
                      {grade}등급컷
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map(({ name, participant, gradeCutoffs }) => (
                  <tr
                    key={name}
                    className="border-b bg-gray-800  bg-opacity-80 hover:bg-opacity-70 border-gray-800"
                  >
                    <th className="px-6 py-4 font-medium text-gray-100 whitespace-nowrap">
                      {name}
                    </th>
                    <td className="px-2 py-4">{participant}</td>
                    {selectedGrades.map((grade) => {
                      const gradeInfo = gradeCutoffs[grade];
                      return (
                        <td key={grade} className="px-2 py-4">
                          {gradeInfo.cutoff} ({gradeInfo.range})
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2번째 화면 */}
      <div
        className={`absolute top-0 right-0 w-full h-full transition-transform duration-500 ${isSliding ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="overflow-x-auto max-w-[1400px] mx-auto">
            <div className="min-h-60"
            ></div>
            <div className="relative w-full overflow-x-auto overflow-y-auto max-h-[55vh] shadow-md rounded-xl">
              <table className="table-auto mx-auto border-collapse text-sm text-left rtl:text-right text-gray-300">
                <thead className="text-xs text-gray-200 uppercase bg-gray-900 bg-opacity-80">
                  <tr>
                    <th className="px-6 py-3">과목</th>
                    <th className="px-6 py-3">새로운 데이터</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(({ name }) => (
                    <tr
                      key={name}
                      className="border-b bg-gray-800 bg-opacity-80 hover:bg-opacity-70 border-gray-800"
                    >
                      <td className="px-6 py-4 font-medium text-gray-100 whitespace-nowrap">
                        {name}
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          className="px-3 py-2 border rounded-lg bg-gray-700 text-white"
                          placeholder="점수 입력"
                          value={updatedScores[name] || ""}
                          onChange={(e) =>
                            setUpdatedScores({ ...updatedScores, [name]: e.target.value })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                onClick={async () => {
                  try {
                    // 입력된 점수 데이터 확인 및 처리
                    for (const [subjectName, score] of Object.entries(updatedScores)) {
                      // 문자열이 아닌 경우에는 trim() 호출하지 않도록 처리
                      if (!score || (typeof score === "string" && score.trim() === "")) {
                        // 입력 값이 없을 경우 삭제
                        await deleteSubjectScore(
                          `${grade}-${semester}-${examType}`,
                          subjectName,
                          year,
                          user
                        );
                        //console.log(`성적 삭제 성공: ${subjectName}`);
                      } else {
                        // 입력 값이 있는 경우 업데이트
                        await editSubjectScore(
                          `${grade}-${semester}-${examType}`,
                          subjectName,
                          year,
                          Number(score),
                          user
                        );
                        //console.log(`성적 업데이트 성공: ${subjectName} - ${score}`);
                      }
                    }
                    alert("성적이 성공적으로 반영되었습니다.");
                    setIsSliding(false); // 기존 화면으로 돌아가기
                  } catch (error) {
                    console.error("성적 처리 오류:", error);
                    //alert("성적 저장 중 문제가 발생했습니다.");
                  }
                }}
                className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-500 to-pink-500 group-hover:from-purple-500 group-hover:to-pink-500 hover:text-white dark:text-white"
              >
                <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
                  저장 및 돌아가기
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {user ? (
        <button
          onClick={async () => {
            try {
              await Logout();
              setUser(null);
              setIsSliding(false);
              //console.log("로그아웃 성공");
            } catch {
              //console.error("로그아웃 오류:");
            }
          }}
          className="fixed bottom-4 right-4 bg-gray-800 bg-opacity-70 hover:bg-opacity-90 text-white font-medium rounded-lg text-xs px-3 py-1"
        >
          로그아웃
        </button>
      ) : null}
    </div>
  );
}