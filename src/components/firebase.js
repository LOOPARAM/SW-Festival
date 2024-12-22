import { initializeApp } from "firebase/app";
import { getFirestore, doc, collection, setDoc, updateDoc, getDocs, deleteDoc } from "firebase/firestore";
import { getAuth, OAuthProvider, signOut, onAuthStateChanged, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new OAuthProvider("microsoft.com");

export async function Login(onSuccess) {
    try {
        // Microsoft OAuthProvider에 추가 옵션 설정
        provider.setCustomParameters({
            prompt: "select_account", // 계정 선택 창 표시
        });

        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        //console.log("로그인 성공:", user);

        // 로그인 성공 시 콜백 실행
        if (onSuccess) {
            onSuccess(user);
        }
    } catch (error) {
        console.error("로그인 오류:", error.message);
        // alert("로그인에 실패했습니다. 다시 시도해주세요.");
    }
}

// 로그아웃 함수
export async function Logout() {
    try {
        await signOut(auth);
        //console.log("로그아웃 성공");
        //alert("로그아웃 성공!");
    } catch (error) {
        console.error("로그아웃 오류:", error.message);
        //alert("로그아웃에 실패했습니다. 다시 시도해주세요.");
    }
}

export function checkAuthState(callback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // 로그인 상태
            callback(user);
        } else {
            // 로그아웃 상태
            callback(null);
        }
    });
}

export async function addSubjectScore(gradeSemester, subject, year, score, user) {
    if (!user) throw new Error("로그인이 필요합니다.");

    const id = user.email.split("@")[0]; // 사용자 ID

    // 학년-학기, 과목, 연도 경로에 추가
    const yearCollection = collection(db, gradeSemester, subject, String(year));
    const newScoreRef = doc(yearCollection);
    const newScoreData = {
        id: id,
        score: score,
        grade: year - parseInt(user.email.split("@")[0].split("-")[0])-1999
    };

    await setDoc(newScoreRef, newScoreData);
    return newScoreData;
}

export async function editSubjectScore(gradeSemester, subject, year, newScore, user) {
    if (!user) throw new Error("로그인이 필요합니다.");

    const id = user.email.split("@")[0];

    // 학년-학기, 과목, 연도에 따라 문서 가져오기
    const yearCollection = collection(db, gradeSemester, subject, String(year));
    const snapshot = await getDocs(yearCollection);

    let docToUpdate = null;

    snapshot.forEach((doc) => {
        if (doc.data().id === id) {
            docToUpdate = doc.ref; // 문서 참조 저장
        }
    });

    if (!docToUpdate) {
        // 문서가 없으면 새로 추가
        console.log(`ID(${id})에 해당하는 문서를 찾을 수 없습니다. 새 문서를 추가합니다.`);
        return await addSubjectScore(gradeSemester, subject, year, newScore, user);
    }

    // 기존 문서 업데이트
    await updateDoc(docToUpdate, { score: newScore });

    //console.log(`학년-학기: ${gradeSemester}, 과목: ${subject}, 연도: ${year}, ID: ${id}, 점수 업데이트 성공: ${newScore}`);
    return { id, subject, score: newScore };
}

export async function deleteSubjectScore(gradeSemester, subject, year, user) {
    if (!user) throw new Error("로그인이 필요합니다.");

    const id = user.email.split("@")[0]; // 사용자 ID
    const yearCollection = collection(db, gradeSemester, subject, String(year));
    const snapshot = await getDocs(yearCollection);

    let docToDelete = null;

    snapshot.forEach((doc) => {
        if (doc.data().id === id) {
            docToDelete = doc.ref; // 문서 참조 저장
        }
    });

    if (!docToDelete) {
        //console.log(`ID(${id})에 해당하는 문서를 찾을 수 없습니다.`);
        return;
    }

    await deleteDoc(docToDelete);
    //console.log(`학년-학기: ${gradeSemester}, 과목: ${subject}, 연도: ${year}, ID: ${id}, 점수 삭제 성공`);
}

export async function fetchSubjects(gradeSemester, year) {
    try {
        const subjectsCollection = collection(db, gradeSemester);
        const snapshot = await getDocs(subjectsCollection);

        const finalFetchedSubjects = [];
        for (const docSnap of snapshot.docs) {
            const subject = docSnap.id;
            const yearCollection = collection(db, gradeSemester, subject, year);
            const yearSnapshot = await getDocs(yearCollection);

            if (!yearSnapshot.empty) {
                finalFetchedSubjects.push(subject);
            }
        }

        //console.log("최종 과목 목록:", finalFetchedSubjects);
        return finalFetchedSubjects;
    } catch (error) {
        console.error("과목 데이터를 가져오는 중 오류 발생:", error.message);
        return [];
    }
}

export {db, auth};