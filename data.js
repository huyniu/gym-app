'use strict';
/* ===== Muscles ===== */
const MUSCLES = {
  chest: 'Ngực', shoulders: 'Vai', traps: 'Cầu vai', biceps: 'Tay trước', triceps: 'Tay sau', forearms: 'Cẳng tay',
  abs: 'Bụng', obliques: 'Bụng chéo', lats: 'Lưng xô', midBack: 'Lưng giữa', lowerBack: 'Lưng dưới',
  glutes: 'Mông', quads: 'Đùi trước', adductors: 'Cơ khép', hamstrings: 'Đùi sau', calves: 'Bắp chân',
};
// Hours to fully recover after a hard session.
const RECOVERY_H = { chest: 72, lats: 72, quads: 72, hamstrings: 72, glutes: 72, lowerBack: 72,
  shoulders: 48, traps: 48, biceps: 48, triceps: 48, forearms: 48, abs: 36, obliques: 36, calves: 48, midBack: 48, adductors: 48 };
const GROUPS = { chest: 'Ngực', back: 'Lưng', shoulders: 'Vai', arms: 'Tay', legs: 'Chân', core: 'Bụng' };

/* ===== Exercise database: [name, group, primary, secondary, steps, tips] ===== */
const EX_DB = [
  ['Bench Press','chest',['chest'],['shoulders','triceps'],
   'Nằm ngửa trên ghế, mắt ngay dưới thanh đòn, hai bàn chân đặt chắc dưới sàn|Nắm thanh rộng hơn vai một chút, siết hai bả vai về sau và xuống|Hạ thanh chậm xuống giữa ngực, khuỷu tay khoảng 45° so với thân|Đẩy thanh lên đến khi gần thẳng tay',
   'Không nảy thanh khỏi ngực|Mông luôn chạm ghế|Tập nặng nên có người đỡ'],
  ['Incline Bench Press','chest',['chest'],['shoulders','triceps'],
   'Chỉnh ghế dốc 30–45°|Nắm thanh rộng hơn vai, siết bả vai|Hạ thanh xuống ngực trên (dưới xương đòn)|Đẩy thanh lên theo đường thẳng',
   'Ghế dốc quá cao sẽ chuyển lực sang vai|Giữ cổ tay thẳng'],
  ['Incline Dumbbell Press','chest',['chest'],['shoulders','triceps'],
   'Ngồi trên ghế dốc 30–45°, đặt tạ đơn lên đùi rồi đưa lên ngang ngực|Lòng bàn tay hướng về phía chân|Đẩy hai tạ lên và hơi khép vào nhau ở điểm cao nhất|Hạ chậm đến khi cảm thấy ngực căng',
   'Không đập hai tạ vào nhau|Kiểm soát lúc hạ tạ khoảng 2–3 giây'],
  ['Dumbbell Fly','chest',['chest'],['shoulders'],
   'Nằm trên ghế phẳng, giữ hai tạ đơn phía trên ngực, khuỷu hơi cong|Mở rộng hai tay sang hai bên theo hình vòng cung|Hạ đến khi ngực căng, khuỷu tay ngang vai|Khép tay lại như đang ôm một thân cây',
   'Giữ góc khuỷu cố định suốt động tác|Dùng tạ nhẹ hơn bài đẩy ngực'],
  ['Chest Dip','chest',['chest'],['triceps','shoulders'],
   'Chống hai tay lên xà kép, duỗi thẳng tay|Ngả người về trước khoảng 30°|Hạ người đến khi bắp tay song song với sàn|Đẩy người lên',
   'Không hạ quá sâu nếu đau vai|Người thẳng đứng thì bài sẽ tác động tay sau nhiều hơn'],
  ['Push-up','chest',['chest'],['triceps','shoulders','abs'],
   'Chống tay rộng hơn vai, người thẳng từ đầu đến gót|Siết bụng và mông|Hạ ngực gần chạm sàn, khuỷu tay khoảng 45°|Đẩy người lên',
   'Không võng hông|Quá khó thì chống gối'],
  ['Squat','legs',['quads','glutes'],['hamstrings','adductors','lowerBack','abs'],
   'Đặt thanh đòn lên cầu vai, hai chân rộng bằng vai, mũi chân hơi mở ra|Hít sâu và siết bụng|Đẩy hông ra sau và gập gối, xuống đến khi đùi song song với sàn hoặc thấp hơn|Đạp mạnh bằng cả bàn chân để đứng lên',
   'Đầu gối đi cùng hướng mũi chân|Giữ lưng trung lập, không cong lưng|Gót chân không nhấc khỏi sàn'],
  ['Front Squat','legs',['quads'],['glutes','abs'],
   'Đặt thanh đòn trên vai trước, khuỷu tay nâng cao|Hai chân rộng bằng vai|Ngồi thẳng xuống, thân giữ thẳng đứng|Đứng lên, khuỷu tay luôn hướng về trước',
   'Khuỷu tay rơi xuống thì thanh sẽ trượt|Tác động đùi trước nhiều hơn squat thường'],
  ['Leg Press','legs',['quads','glutes'],['hamstrings','adductors'],
   'Ngồi vào máy, lưng và hông áp sát đệm|Hai chân đặt trên bàn đạp, rộng bằng vai|Mở chốt an toàn, hạ bàn đạp đến khi gối gập khoảng 90°|Đạp lên nhưng không khóa cứng gối',
   'Không để hông nhấc khỏi đệm|Đặt chân cao hơn thì tác động mông và đùi sau nhiều hơn'],
  ['Bulgarian Split Squat','legs',['quads','glutes'],['hamstrings','adductors'],
   'Đứng quay lưng về ghế, đặt mu bàn chân sau lên ghế|Chân trước bước xa khoảng 60–80 cm|Hạ người thẳng xuống đến khi đùi trước song song với sàn|Đạp gót chân trước để đứng lên',
   'Thân hơi ngả về trước thì tác động mông nhiều hơn|Tập xong chân này mới đổi chân'],
  ['Lunge','legs',['quads','glutes'],['hamstrings','adductors','calves'],
   'Đứng thẳng, cầm tạ đơn ở hai bên|Bước một chân lên trước|Hạ người đến khi hai gối gập khoảng 90°|Đạp chân trước để về tư thế ban đầu',
   'Gối trước không đổ vào trong|Thân giữ thẳng'],
  ['Leg Extension','legs',['quads'],[],
   'Ngồi vào máy, chỉnh đệm chặn ngay trên cổ chân|Khớp gối thẳng hàng với trục máy|Duỗi chân đến khi thẳng, siết đùi trước 1 giây|Hạ chậm',
   'Không dùng đà|Phù hợp để làm nóng gối hoặc tập kết thúc buổi'],
  ['Leg Curl','legs',['hamstrings'],['calves'],
   'Nằm sấp (hoặc ngồi) vào máy, đệm chặn đặt trên gót chân|Gập gối kéo đệm về phía mông|Siết đùi sau ở điểm cao nhất|Hạ chậm',
   'Hông áp sát đệm|Không vung tạ'],
  ['Romanian Deadlift','legs',['hamstrings','glutes'],['lowerBack','forearms'],
   'Đứng thẳng cầm thanh đòn trước đùi, gối hơi cong|Đẩy hông ra sau, thanh trượt sát theo chân|Hạ đến khi đùi sau căng (khoảng giữa ống chân)|Đẩy hông về trước để đứng lên',
   'Giữ lưng thẳng suốt động tác|Đây là động tác gập hông, không phải squat'],
  ['Deadlift','back',['hamstrings','glutes','lowerBack'],['lats','midBack','traps','forearms','quads'],
   'Đứng với giữa bàn chân ngay dưới thanh đòn|Cúi xuống nắm thanh, ống chân chạm thanh|Hít sâu, siết bụng, ưỡn ngực, giữ lưng thẳng|Đạp sàn và đẩy hông lên, thanh đi sát người|Đứng thẳng, sau đó hạ thanh theo đường cũ',
   'Không cong lưng dưới|Không ngả người ra sau ở điểm cao nhất|Nên học kỹ thuật với tạ nhẹ trước'],
  ['Hip Thrust','legs',['glutes'],['hamstrings','quads'],
   'Tựa lưng trên vào cạnh ghế, thanh đòn đặt ngang hông (dùng đệm lót)|Hai bàn chân rộng bằng vai, gối gập khoảng 90° ở điểm cao nhất|Đẩy hông lên đến khi thân thẳng từ vai đến gối|Siết mông 1–2 giây rồi hạ xuống',
   'Cằm hơi cúi, mắt nhìn về trước|Không ưỡn lưng dưới'],
  ['Calf Raise','legs',['calves'],[],
   'Đứng với nửa trước bàn chân trên bục, gót chân để thả|Hạ gót xuống thấp hết mức|Kiễng chân lên cao hết mức|Giữ 1 giây rồi hạ chậm',
   'Bắp chân cần biên độ đầy đủ|Nên tập số rep cao (12–20)'],
  ['Overhead Press','shoulders',['shoulders'],['triceps','traps','abs'],
   'Đứng, thanh đòn đặt ở vai trước, nắm rộng hơn vai một chút|Siết bụng và mông|Đẩy thanh thẳng lên trên đầu, đầu hơi lùi ra sau để thanh đi qua|Hạ thanh về vai trước',
   'Không ưỡn lưng quá mức|Ở điểm cao nhất, thanh nằm thẳng trên giữa bàn chân'],
  ['Dumbbell Shoulder Press','shoulders',['shoulders'],['triceps'],
   'Ngồi trên ghế có tựa lưng, tạ đơn ngang vai|Lòng bàn tay hướng về trước|Đẩy tạ lên trên đầu|Hạ đến khi tạ ngang tai',
   'Lưng áp sát ghế|Không khóa cứng khuỷu tay'],
  ['Lateral Raise','shoulders',['shoulders'],['traps'],
   'Đứng cầm hai tạ đơn bên hông, khuỷu hơi cong|Nâng tạ sang hai bên đến ngang vai|Dẫn tạ bằng khuỷu tay, ngón út hơi cao hơn ngón cái|Hạ chậm',
   'Dùng tạ nhẹ và đúng form|Không nhún vai, không vung người'],
  ['Rear Delt Fly','shoulders',['shoulders'],['midBack','traps'],
   'Cúi người gần song song với sàn (hoặc dùng máy)|Hai tạ đơn treo dưới ngực, khuỷu hơi cong|Mở hai tay sang hai bên đến ngang vai|Hạ chậm',
   'Tập trung vào vai sau, không kéo bằng lưng|Dùng tạ nhẹ'],
  ['Face Pull','shoulders',['shoulders'],['midBack','traps'],
   'Gắn dây thừng ở cáp, ngang hoặc cao hơn mặt|Nắm dây, lùi lại một bước|Kéo dây về phía mặt, tách hai tay ra hai bên tai|Siết vai sau 1 giây rồi trả về',
   'Khuỷu tay giữ cao|Bài rất tốt cho sức khỏe khớp vai'],
  ['Pull-up','back',['lats'],['biceps','forearms','traps'],
   'Treo trên xà, nắm sấp rộng hơn vai|Kéo bả vai xuống trước|Kéo người lên đến khi cằm qua xà|Hạ chậm đến khi thẳng tay',
   'Không đung đưa người|Chưa kéo được thì dùng dây kháng lực hoặc máy hỗ trợ'],
  ['Chin-up','back',['lats','biceps'],['forearms'],
   'Treo trên xà, nắm ngửa rộng bằng vai|Kéo người lên đến khi cằm qua xà|Siết lưng và tay trước|Hạ chậm',
   'Dễ hơn pull-up vì tay trước hỗ trợ nhiều hơn'],
  ['Lat Pulldown','back',['lats'],['biceps','shoulders'],
   'Ngồi vào máy, đệm chặn giữ đùi|Nắm thanh rộng hơn vai|Ngả nhẹ ra sau, kéo thanh xuống ngực trên|Siết xô rồi trả thanh lên chậm',
   'Kéo bằng khuỷu tay, không kéo bằng tay|Không kéo thanh ra sau gáy'],
  ['Barbell Row','back',['lats','midBack'],['biceps','lowerBack','traps','shoulders'],
   'Cầm thanh đòn, gập hông cho thân nghiêng khoảng 45° hoặc thấp hơn|Lưng thẳng, gối hơi cong|Kéo thanh về bụng dưới|Siết bả vai rồi hạ chậm',
   'Không giật người lên|Giữ nguyên góc thân suốt động tác'],
  ['Dumbbell Row','back',['lats','midBack'],['biceps','shoulders'],
   'Chống một tay và một gối lên ghế|Tay kia cầm tạ đơn, lưng song song với sàn|Kéo tạ về phía hông|Hạ chậm, để tạ duỗi hết',
   'Kéo khuỷu tay về sau, không vặn người'],
  ['Seated Cable Row','back',['lats','midBack'],['biceps','traps','shoulders'],
   'Ngồi vào máy, chân đặt trên bàn đạp, gối hơi cong|Nắm tay cầm, lưng thẳng|Kéo tay cầm về bụng, ưỡn ngực|Trả về chậm, để bả vai giãn ra',
   'Không ngả người ra sau quá nhiều'],
  ['T-Bar Row','back',['lats','midBack'],['traps','biceps','lowerBack'],
   'Đứng hai bên thanh T-bar, gập hông khoảng 45°|Nắm tay cầm, lưng thẳng|Kéo tạ lên ngực dưới|Hạ chậm',
   'Giữ lưng dưới cố định'],
  ['Shrug','back',['traps'],['forearms'],
   'Đứng cầm tạ ở hai bên|Nhún vai lên thẳng về phía tai|Giữ 1 giây|Hạ chậm',
   'Không xoay vai|Có thể dùng dây kéo (strap) nếu tạ nặng'],
  ['Bicep Curl','arms',['biceps'],['forearms'],
   'Đứng thẳng cầm tạ, lòng bàn tay hướng về trước|Khuỷu tay sát hông|Cuốn tạ lên đến vai|Hạ chậm đến khi thẳng tay',
   'Không vung người|Khuỷu tay không đưa ra trước'],
  ['Hammer Curl','arms',['biceps','forearms'],[],
   'Cầm tạ đơn, lòng bàn tay hướng vào nhau|Khuỷu tay sát hông|Cuốn tạ lên|Hạ chậm',
   'Tác động cả cẳng tay và tay trước'],
  ['Preacher Curl','arms',['biceps'],[],
   'Ngồi vào ghế preacher, bắp tay áp lên đệm|Cầm thanh EZ hoặc tạ đơn|Cuốn lên|Hạ chậm, gần thẳng tay',
   'Không duỗi bật ở điểm thấp nhất để tránh chấn thương'],
  ['Tricep Pushdown','arms',['triceps'],[],
   'Đứng trước máy cáp, nắm dây thừng hoặc thanh|Khuỷu tay sát hông|Đẩy xuống đến khi thẳng tay|Trả về chậm',
   'Chỉ cẳng tay di chuyển|Không dùng sức nặng cơ thể đè xuống'],
  ['Skull Crusher','arms',['triceps'],[],
   'Nằm trên ghế, cầm thanh EZ thẳng phía trên ngực|Gập khuỷu, hạ thanh về phía trán|Duỗi tay đẩy thanh lên|Bắp tay giữ cố định',
   'Dùng tạ vừa phải|Có thể hạ thanh ra sau đầu để giảm áp lực khuỷu'],
  ['Overhead Tricep Extension','arms',['triceps'],[],
   'Cầm một tạ đơn bằng hai tay phía trên đầu|Gập khuỷu, hạ tạ ra sau đầu|Duỗi tay lên|Khuỷu tay hướng lên trên',
   'Kéo giãn tay sau rất tốt|Siết bụng để không ưỡn lưng'],
  ['Plank','core',['abs'],['obliques','shoulders'],
   'Chống cẳng tay, khuỷu tay ngay dưới vai|Người thẳng từ đầu đến gót|Siết bụng và mông|Giữ tư thế theo thời gian (nhập số giây vào ô reps)',
   'Không võng hoặc nhô hông|Thở đều'],
  ['Hanging Leg Raise','core',['abs'],['obliques','forearms'],
   'Treo người trên xà|Siết bụng, nâng chân lên ngang hông hoặc cao hơn|Cuộn khung chậu lên|Hạ chậm, không đung đưa',
   'Khó quá thì nâng gối thay vì nâng chân thẳng'],
  ['Cable Crunch','core',['abs'],['obliques'],
   'Quỳ trước máy cáp, cầm dây thừng giữ cạnh đầu|Gập bụng cuộn người xuống, khuỷu tay về phía đùi|Siết bụng|Trả về chậm',
   'Gập bằng bụng, không ngồi xuống bằng hông'],
  ['Ab Wheel','core',['abs'],['lats','shoulders'],
   'Quỳ gối, hai tay cầm con lăn|Siết bụng, lăn ra trước chậm|Lăn xa nhất có thể mà lưng không võng|Kéo con lăn về bằng bụng',
   'Mới tập thì lăn biên độ ngắn'],
];
// Sample workouts used by the home suggestion when the user has no routine yet (3 sets each).
const SPLITS = {
  push: { name: 'Push day', desc: 'Ngực, vai, tay sau', muscles: ['chest', 'shoulders', 'triceps'], ex: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Lateral Raise', 'Tricep Pushdown'] },
  pull: { name: 'Pull day', desc: 'Lưng, tay trước', muscles: ['lats', 'midBack', 'biceps'], ex: ['Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'Face Pull', 'Bicep Curl'] },
  legs: { name: 'Leg day', desc: 'Đùi, mông, bắp chân', muscles: ['quads', 'hamstrings', 'glutes'], ex: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise'] },
  core: { name: 'Bụng & core', desc: 'Bụng, bụng chéo', muscles: ['abs', 'obliques'], ex: ['Plank', 'Hanging Leg Raise', 'Cable Crunch', 'Ab Wheel'] },
};
// Image files: img/ex/<slug>-0.jpg (start position) and -1.jpg (end position), from free-exercise-db (Unlicense).
const exSlug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const EX_MAP =Object.fromEntries(EX_DB.map(([n, g, p, s, st, tp]) => [n, { name: n, g, p, s, steps: st.split('|'), tips: tp ? tp.split('|') : [] }]));

/* ===== Body map — viewBox 0 0 200 400, left half drawn then mirrored at x=100 ===== */
const MIR = d => `<path d="${d}"/><path d="${d}" transform="matrix(-1 0 0 1 200 0)"/>`;
const BODY_VIEWBOX = '0 0 200 400';
const BODY_BASE =
  '<ellipse cx="100" cy="34" rx="17" ry="21"/><path d="M89 50 L111 50 L113 70 L87 70 Z"/>' +
  MIR('M100 64 C84 64 66 68 56 78 C50 84 48 92 50 104 L58 120 C60 150 64 172 68 196 L100 200 Z') + // torso
  MIR('M56 78 C44 82 38 96 36 116 L32 150 L48 154 L54 126 C56 112 58 98 60 86 Z') +             // upper arm
  MIR('M32 148 C28 168 24 186 22 202 L34 205 C38 188 44 170 49 152 Z') +                       // forearm
  MIR('M22 202 C16 212 16 226 22 232 C30 234 36 222 34 205 Z') +                              // hand
  MIR('M68 190 L100 196 L100 226 L64 222 C64 210 66 200 68 190 Z') +                          // hips
  MIR('M64 206 C60 240 62 274 70 302 L94 302 C98 272 100 242 100 214 Z') +                     // thigh
  MIR('M70 300 C64 326 66 356 74 382 L90 382 C94 356 96 328 94 300 Z') +                       // shin
  MIR('M72 380 C64 386 66 394 76 395 L92 395 C94 390 92 384 90 380 Z');                        // foot
const BODY_FRONT = [
  ['shoulders', MIR('M60 76 C48 78 40 90 40 106 C48 106 56 100 62 92 C66 86 66 80 60 76 Z')],
  ['chest', MIR('M98 80 L98 116 C86 122 72 120 64 110 C60 98 64 86 74 82 C82 79 90 79 98 80 Z')],
  ['biceps', MIR('M43 110 C38 120 36 134 37 146 C44 147 49 139 51 128 C53 118 50 110 43 110 Z')],
  ['forearms', MIR('M35 152 C31 168 27 184 25 199 L32 201 C38 186 44 170 47 155 Z')],
  ['abs', MIR('M87 124 h11 v14 h-11 Z') + MIR('M87 141 h11 v14 h-11 Z') + MIR('M87 158 h11 v14 h-11 Z') + MIR('M88 175 h10 v18 h-6 Z')],
  ['obliques', MIR('M68 120 C70 142 72 164 76 186 L84 184 C82 164 82 142 84 124 Z')],
  ['quads', MIR('M68 212 C64 240 66 270 73 296 L88 298 C91 276 92 246 89 222 C82 214 75 211 68 212 Z')],
  ['adductors', MIR('M98 216 C93 232 90 250 91 272 L95 268 C98 250 99 232 98 216 Z')],
  ['calves', MIR('M72 310 C68 330 70 352 76 368 L81 368 C79 348 79 328 82 310 Z')],
];
const BODY_BACK = [
  ['traps', MIR('M100 52 L100 104 C92 96 84 86 72 79 C82 74 89 64 91 52 Z')],
  ['shoulders', MIR('M60 76 C48 78 40 90 40 106 C48 106 56 100 62 92 C66 86 66 80 60 76 Z')],
  ['lats', MIR('M65 98 C62 122 68 144 80 164 L93 168 C91 152 86 140 80 128 C75 116 72 106 65 98 Z')],
  ['midBack', MIR('M98 108 L98 150 C92 146 86 138 83 128 C81 118 83 110 89 102 Z')],
  ['triceps', MIR('M43 108 C38 118 36 132 37 146 C44 147 49 139 51 128 C53 116 50 108 43 108 Z')],
  ['forearms', MIR('M35 152 C31 168 27 184 25 199 L32 201 C38 186 44 170 47 155 Z')],
  ['lowerBack', MIR('M98 156 L98 190 L83 187 C83 176 85 166 89 158 Z')],
  ['glutes', MIR('M98 196 C98 214 96 228 88 234 C76 236 67 228 66 214 C66 202 74 194 86 194 Z')],
  ['hamstrings', MIR('M70 240 C68 262 70 282 76 298 L90 298 C94 280 94 258 92 238 Z')],
  ['calves', MIR('M72 306 C66 322 68 342 76 358 C83 356 87 340 87 322 C87 312 83 306 72 306 Z')],
];
// Label placement around the figure (left column / right column) for each side.
const BODY_LABELS = {
  front: [['shoulders', 'chest', 'biceps', 'abs', 'quads'], ['forearms', 'obliques', 'adductors', 'calves']],
  back: [['traps', 'shoulders', 'triceps', 'lowerBack', 'hamstrings'], ['lats', 'midBack', 'forearms', 'glutes', 'calves']],
};

/* ===== Foods (per 100 g, cooked/ready-to-eat, approximate) ===== */
// [kcal, protein, carbs, fat, unit?]
const FOODS = {
  'Cơm trắng': [130, 2.7, 28, 0.3, ['chén', 150]],
  'Cơm gạo lứt': [112, 2.6, 24, 0.9, ['chén', 150]],
  'Bún': [110, 1.7, 25, 0.2],
  'Bánh mì': [265, 9, 49, 3.2, ['ổ', 80]],
  'Yến mạch': [389, 17, 66, 7],
  'Khoai lang luộc': [86, 1.6, 20, 0.1],
  'Chuối': [89, 1.1, 23, 0.3, ['quả', 120]],
  'Táo': [52, 0.3, 14, 0.2, ['quả', 180]],
  'Ức gà': [165, 31, 0, 3.6],
  'Thịt bò nạc': [190, 27, 0, 9],
  'Thịt heo nạc': [143, 21, 0, 6],
  'Cá hồi': [208, 20, 0, 13],
  'Cá basa': [110, 18, 0, 4],
  'Trứng gà': [143, 12.6, 0.7, 9.5, ['quả', 50]],
  'Lòng trắng trứng': [52, 11, 0.7, 0.2, ['quả', 33]],
  'Đậu phụ': [76, 8, 1.9, 4.8],
  'Sữa tươi không đường': [61, 3.2, 4.8, 3.3, ['hộp', 180]],
  'Sữa chua không đường': [61, 3.5, 4.7, 3.3, ['hũ', 100]],
  'Rau xanh luộc': [25, 2, 4, 0.3],
  'Đậu phộng rang': [585, 24, 21, 50],
  'Dầu ăn': [884, 0, 0, 100],
};
// Each item: [food, grams, role]  role: P = scaled for protein, C = scaled for carbs, O = scaled for fat, F = fixed
const MENUS = [
  { name: 'Thực đơn A', meals: [
    ['Bữa sáng', [['Yến mạch', 60, 'C'], ['Sữa tươi không đường', 180, 'F'], ['Chuối', 120, 'C'], ['Trứng gà', 100, 'P']]],
    ['Bữa trưa', [['Cơm trắng', 200, 'C'], ['Ức gà', 150, 'P'], ['Rau xanh luộc', 200, 'F'], ['Dầu ăn', 5, 'O']]],
    ['Bữa phụ (trước/sau tập)', [['Khoai lang luộc', 150, 'C'], ['Sữa chua không đường', 100, 'F'], ['Đậu phộng rang', 15, 'O']]],
    ['Bữa tối', [['Cơm trắng', 150, 'C'], ['Cá hồi', 120, 'P'], ['Rau xanh luộc', 200, 'F'], ['Dầu ăn', 5, 'O']]],
  ] },
  { name: 'Thực đơn B', meals: [
    ['Bữa sáng', [['Bánh mì', 80, 'C'], ['Trứng gà', 100, 'P'], ['Sữa tươi không đường', 180, 'F']]],
    ['Bữa trưa', [['Bún', 200, 'C'], ['Thịt bò nạc', 120, 'P'], ['Rau xanh luộc', 150, 'F']]],
    ['Bữa phụ (trước/sau tập)', [['Chuối', 120, 'C'], ['Sữa chua không đường', 100, 'F'], ['Đậu phộng rang', 15, 'O']]],
    ['Bữa tối', [['Cơm gạo lứt', 150, 'C'], ['Thịt heo nạc', 120, 'P'], ['Đậu phụ', 100, 'P'], ['Rau xanh luộc', 200, 'F'], ['Dầu ăn', 5, 'O']]],
  ] },
  { name: 'Thực đơn C', meals: [
    ['Bữa sáng', [['Yến mạch', 60, 'C'], ['Táo', 180, 'C'], ['Sữa chua không đường', 100, 'F'], ['Lòng trắng trứng', 132, 'P']]],
    ['Bữa trưa', [['Cơm trắng', 200, 'C'], ['Cá basa', 180, 'P'], ['Rau xanh luộc', 200, 'F'], ['Dầu ăn', 5, 'O']]],
    ['Bữa phụ (trước/sau tập)', [['Khoai lang luộc', 150, 'C'], ['Trứng gà', 50, 'P'], ['Đậu phộng rang', 15, 'O']]],
    ['Bữa tối', [['Cơm trắng', 150, 'C'], ['Ức gà', 150, 'P'], ['Rau xanh luộc', 200, 'F'], ['Dầu ăn', 5, 'O']]],
  ] },
];
