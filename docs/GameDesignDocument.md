## 1. Tổng quan game

*   **Tên dự án:** Lumina Voyage
*   **Thể loại:** Atmospheric Adventure / Puzzle / Rhythm
*   **Nền tảng:** Web Browser (PC/Mobile)
*   **Công nghệ lõi:** Three.js (Graphics), Cannon.js (Physics), Tone.js (Audio), GSAP (Animation).
*   **Concept:** Người chơi là một đốm sáng nhỏ (Lumina) mới sinh ra, du hành qua các trạng thái vật lý của ánh sáng (Hỗn mang, Khúc xạ, Phản xạ, Hòa âm) để trở thành một bản giao hưởng hoàn chỉnh.
*   **USP (Unique Selling Point):**
    *   Sự kết hợp giữa vật lý ánh sáng (quang học) và âm nhạc.
    *   Cơ chế "Echolocation" (định vị bằng tiếng vang/ánh sáng).
    *   Đồ họa Low-poly Diorama kết hợp hiệu ứng Post-processing hiện đại.

## 2. Chân dung người chơi

*   **Bartle Taxonomy:** Explorers (Thích khám phá cái đẹp), Achievers (Hoàn thành thử thách khéo léo).
*   **Phong cách chơi:** Chill, thư giãn nhưng đòi hỏi sự tập trung vào nhịp điệu và quan sát.

## 3. Gameplay tổng quan

*   **Core Loop:** Di chuyển (Bay/Lướt) -> Tương tác (Xung ánh sáng) -> Giải đố/Né tránh -> Thu thập năng lượng -> Mở cổng sang màn sau.
*   **Góc nhìn:** Thay đổi linh hoạt theo từng màn (Top-down, Isometric, Orbital).
*   **Điều kiện thắng:** Hoàn thành bản giao hưởng tại màn cuối cùng.
*   **Điều kiện thua (Soft Fail):** Hết năng lượng (ánh sáng tắt), bị hút vào hố đen (reset về checkpoint).

## 4. Cơ chế game (Game Mechanics)



### Cơ chế di chuyển (Movement Physics)

*   **Mô tả Tổng quan (Core Concept):**
    Người chơi điều khiển thực thể Orb (Đốm sáng) trong môi trường không trọng lực (Zero-G). Hệ thống di chuyển được xây dựng hoàn toàn dựa trên cơ chế vật lý (Physics-based locomotion), trong đó hướng nhìn của Camera đóng vai trò là vector định hướng chính cho mọi lực đẩy.

*   **Hệ thống Điều khiển (Input Mapping):**
    *   **Chuột (Mouse Look):** Xoay Camera để quan sát, đồng thời xác định hướng di chuyển phía trước (Forward Vector) của nhân vật.
    *   **Di chuyển Mặt phẳng (Planar Movement - WASD):** Kích hoạt lực đẩy (Thrust) để di chuyển theo hướng tương đối so với góc nhìn Camera (Tiến/Lùi/Trái/Phải).
    *   **Di chuyển Trục dọc (Vertical Movement - Free Flight Levels):** *Áp dụng cho các màn chơi cho phép bay tự do.*
        *   **Phím E:** Kích hoạt lực đẩy hướng lên (Ascend).
        *   **Phím Q:** Kích hoạt lực đẩy hướng xuống (Descend).
    *   **Spacebar (Contextual Action):** Cơ chế Thoát hiểm (Escape Mechanic).
        *   **Logic:** Nút này bị vô hiệu hóa trong điều kiện thường. Chỉ kích hoạt (Active) khi nhân vật bị hút vào trường lực của Hố Đen (Black Hole) để thực hiện pha bứt tốc thoát ly.

*   **Quy tắc Kỹ thuật (Technical Rules):**
    *   **Physics Implementation:** Sử dụng thư viện `Cannon.js`. Mọi chuyển động phải được thực hiện thông qua việc tác động Lực (AddForce) hoặc Vận tốc (Velocity). **Tuyệt đối không** sử dụng phương pháp gán tọa độ trực tiếp (Set Position) để đảm bảo tính nhất quán của vật lý.
    *   **Quán tính & Trôi (Inertia & Drift):** Hệ thống mô phỏng môi trường có lực cản thấp (Low Drag). Khi người chơi ngắt Input, nhân vật sẽ không dừng đột ngột mà tiếp tục trôi theo đà (Momentum), sau đó giảm tốc từ từ dựa trên ma sát môi trường.
    *   **Cảm giác Camera (Camera Juice/Twirl):** Khi phát hiện Input chuột (Mouse Look) xoay sang trái/phải với vận tốc cao, Camera sẽ thực hiện nghiêng nhẹ trục Z (Dutch angle/Banking) theo hướng xoay để tạo hiệu ứng thị giác bay lượn mượt mà và năng động.

*   **Xử lý Ngoại lệ (Edge Cases):**
    *   **World Boundaries:** Thiết lập các Tường vô hình (Invisible Wall) giới hạn khu vực chơi. Khi va chạm, nhân vật sẽ chịu một phản lực đàn hồi (Elastic Bounce), nảy nhẹ ngược trở lại về phía trung tâm màn chơi, ngăn chặn việc kẹt hoặc bay ra khỏi map.

### Cơ chế Xung ánh sáng (Light Pulse)

*   **Mô tả:** Kỹ năng chính của người chơi để soi đường và tương tác.
*   **Input:** Phím `F` hoặc `Click chuột trái`.
*   **Quy tắc:**
    *   Khi kích hoạt, một vòng tròn sóng (Wave) tỏa ra từ nhân vật.
    *   **Soi đường:** Trong bóng tối, Pulse va chạm vào vật thể sẽ làm vật thể phát sáng viền (Edge detection) trong 2-3 giây.
    *   **Kích hoạt:** Pulse chạm vào "Pha lê năng lượng" sẽ làm nó phát nhạc và sáng lên.
*   **Cooldown:** 1 giây (để tránh spam làm hỏng trải nghiệm âm thanh).

### Cơ chế Năng lượng (Luminosity System)

*   **Mô tả:** Đóng vai trò là Thanh máu (HP) và Nhiên liệu.
*   **Dữ liệu:** Giá trị `CurrentLumen` (0 - 100).
*   **Quy tắc:**
    *   Mặc định: Giảm dần theo thời gian (0.5 điểm/giây) - mô phỏng sự tàn lụi.
    *   Va chạm chướng ngại vật (Thiên thạch/Bóng tối): Trừ 10-20 điểm.
    *   Thu thập `Orb Năng Lượng`: Cộng 15 điểm + Tăng kích thước vùng sáng tạm thời.
    *   **Trạng thái:**
        *   `Lumen > 80`: Di chuyển nhanh, vùng sáng rộng.
        *   `Lumen < 20`: Di chuyển chậm, màn hình tối (Vignette), âm thanh bị méo (Distortion).
        *   `Lumen = 0`: Game Over (Fade to black -> Respawn).

### Cơ chế Thoát hiểm (QTE - Quick Time Event)

*   **Mô tả:** Dùng khi bị Hố đen (Black Hole) hút vào ở Scene 1.
*   **Input:** Nhấn `Space` liên tục.
*   **Quy tắc:**
    *   Hiện thanh lực đối kháng.
    *   Nếu tốc độ nhấn > lực hút -> Thoát ra được + Boost tốc độ.
    *   Nếu thua -> Bị hút vào -> Reset checkpoint.

## 5. Hệ thống game (Game Systems)



### Hệ thống Âm thanh tương tác (Procedural Audio)

*   **Công nghệ:** Tone.js.
*   **Quy tắc:**
    *   Mỗi Level có một bộ Note (Thang âm) riêng (Ví dụ: Pentatonic, Minor Scale).
    *   Di chuyển: Có âm thanh Pad nền (Ambient).
    *   Va chạm/Thu thập: Phát ra một nốt nhạc ngẫu nhiên trong thang âm quy định -> Tạo ra giai điệu không lặp lại.
    *   Tốc độ di chuyển ảnh hưởng đến Tempo hoặc Pitch của nhạc nền.

### Hệ thống Camera (Cinematic Controller)

*   **Quy tắc:**
    *   Camera không fix cứng mà đi theo `Spline Path` (đường ray vô hình) nhưng cho phép người chơi di chuyển tự do trong khung hình (Rail-shooter style cho Scene 1).
    *   Chuyển cảnh: Smooth Lerp (Linear Interpolation).

## 6. Thiết kế Level (Level Design)



### Level 0: The Void (Tutorial)

**Bối cảnh (Context):** **Hư không (The Void)** – Một không gian vô tận, bị bao trùm bởi bóng tối vĩnh cửu và sự tĩnh lặng tuyệt đối.

**Mục tiêu thiết kế (Design Goal):** Onboarding người chơi về cơ chế Di chuyển (Navigation), Định vị (Pulse) và xây dựng đường cong trải nghiệm (Progression Curve) thông qua **Thị giác, Thính giác & Động năng** (A/V & Kinetic).

**Flow (Luồng trải nghiệm chi tiết):**

1.  **Spawn:** Người chơi khởi tạo giữa hư không dưới dạng một **đốm sáng mờ (Dim Light)**, tượng trưng cho sự khởi nguồn của ý thức.
2.  **Tutorial:** Giao diện (UI) hiển thị chỉ dẫn tối giản, hòa nhập với môi trường: "**Press F to Pulse**".
3.  **Cơ chế Định vị (Pulse Mechanic):**
    *   **Nguyên lý:** Sử dụng cơ chế **Echolocation (Định vị bằng tiếng vang)**.
    *   **Tương tác:** Khi kích hoạt, một sóng năng lượng quét qua không gian. Các **Orb Năng Lượng** sẽ rực sáng khi sóng chạm vào, để lại **dư ảnh (Wireframe/Outline)**.
    *   **Thách thức:** Các dư ảnh này sẽ **mờ dần (Fade out)** trở lại vào bóng tối sau vài giây. Điều này khuyến khích người chơi phải ghi nhớ bản đồ ngắn hạn hoặc sử dụng Pulse liên tục để duy trì tầm nhìn.

4.  **Thiết kế Màn chơi (Level Design - Breadcrumb Trail):**
    *   **Bố trí:** **5 Orb Năng Lượng** được sắp xếp thành một **đường dẫn (Breadcrumb Trail)** với độ cong tinh tế.
    *   **Định hướng:** Chuỗi Orb hoạt động như một mũi tên vô hình, điều hướng người chơi về phía trục chính của màn chơi.
    *   **Mục đích (Design Intent):** Đây là **Tutorial ẩn (Invisible Tutorial)**. Đường cong buộc người chơi phối hợp các phím điều hướng đa chiều thay vì di chuyển tuyến tính, giúp họ làm quen với vật lý của nhân vật.

5.  **Cơ chế Thu thập (Magnetic Collection):**
    *   **Hoạt động:** Hệ thống sử dụng bán kính từ tính (Magnetic Radius). Khi người chơi Pulse hoặc di chuyển lại gần, Orb sẽ tự động bị hút về phía nhân vật kèm hiệu ứng **vệt sáng đuôi sao chổi (Comet Tail)**.
    *   **Lợi ích:** Đảm bảo nhịp độ (Pacing) mượt mà, loại bỏ sự ức chế khi phải căn chỉnh vị trí chính xác (Pixel-perfect collision), tạo cảm giác thỏa mãn khi thu thập.

6.  **Hệ thống Phản hồi Đa giác quan (Multi-sensory Progression):**
    *   Mỗi Orb thu thập được sẽ nâng cấp trạng thái của nhân vật theo 3 trục:
        *   **Visual:** Đốm sáng nhân vật rực rỡ hơn, bán kính Pulse mở rộng hơn.
        *   **Audio:** Mỗi Orb kích hoạt một lớp âm thanh (**Music Layer**) mới (Bass, Pad, Synth...), dần lấp đầy sự im lặng bằng giai điệu.
        *   **Kinetic (Mới):** Mỗi Orb gia tăng **Tốc độ di chuyển (Movement Speed)** và độ nhạy của nhân vật. Người chơi sẽ cảm thấy bản thân trở nên nhanh hơn, linh hoạt hơn và tích tụ động năng lớn dần.

7.  **Sự kiện Cao trào & Chuyển cảnh (Climax & Transition):**
    *   **Trạng thái Quá tải (Overload):** Khi thu thập đủ **5 Orb** (đạt tốc độ tối đa và trạng thái Core Light):
        *   Nhân vật phát nổ năng lượng, tạo ra một màn hình trắng xóa (**Full-screen White Flash/Bloom**) trong tích tắc.
    *   **Sự xuất hiện của Cổng:**
        *   Khi màn hình trắng mờ dần, một **Cổng Không Gian (Portal)** khổng lồ xuất hiện ở phía xa (Distance), trở thành điểm nhấn thị giác (Focal Point) duy nhất trong bóng tối.
    *   **Hành trình cuối (The Final Flight):**
        *   Người chơi tận dụng tốc độ tối đa vừa đạt được để bay xuyên qua khoảng không, lao thẳng về phía Cổng.
        *   Khi chạm vào Cổng -> Chuyển sang **Scene 1**.

### Level 1: The Ascent (Hành trình vươn lên)

*   **Thể loại:** High-Speed Action / Obstacle Dodge / Speedrun.
*   **Bối cảnh:** Vũ trụ sơ khai, không gian ngập tràn thiên thạch và tàn dư vật chất.
*   **Nhân vật (Avatar):** **Luminous Orb** - Một quả cầu năng lượng phát sáng lơ lửng, đại diện cho ý chí khởi nguyên.
*   **Camera:** Góc nhìn từ trên xuống (Top-down) nghiêng 15-20 độ. Camera khóa theo trục dọc, tự động cuộn (Auto-scroll) với tốc độ đồng bộ theo vận tốc của nhân vật.

*   **Cơ chế cốt lõi (Core Loop):**
    *   **Gia tốc & Thu thập (Active Acceleration):** Thay vì gia tốc thụ động hoàn toàn, nhân vật sẽ chỉ tự động bay với gia tốc nền tăng rất chậm theo thời gian. Để đạt tốc độ tối đa, người chơi bắt buộc phải di chuyển linh hoạt để thu thập các hạt **Photon (Hạt ánh sáng)** rải rác trên đường bay. Việc ăn **Photon** sẽ giúp tăng đột biến thanh tiến trình tốc độ, loại bỏ lối chơi thụ động (camping) và khuyến khích người chơi rời khỏi các làn an toàn (**Safe spot**).
    *   **Hình phạt va chạm (Momentum Loss):** Mọi va chạm với chướng ngại vật sẽ không gây mất máu mà trực tiếp làm **giảm vận tốc tích lũy**, ảnh hưởng tiêu cực đến thành tích thời gian (Speedrun Timer).

*   **Hệ thống chướng ngại vật & Môi trường:**
    *   **Thiên thạch (Static Obstacle):** Bay chậm hoặc trôi nổi tự do. Va chạm sẽ gây giảm tốc độ đáng kể và đẩy lùi nhân vật.
    *   **Shadow Comet (Dynamic Threat):** Bay với tốc độ cao cắt ngang màn hình.
        *   **Cơ chế phát hiện:** Sử dụng hệ thống **HUD Warning Indicators** (Biểu tượng cảnh báo) xuất hiện ở rìa màn hình tương ứng hướng sao chổi sắp lao tới, giúp người chơi có thời gian phản xạ.
    *   **Hố đen (Environmental Tool):** Duy trì cơ chế vật lý **Gravity Slingshot** để tối ưu hóa tốc độ (Flow):
        *   **Lớp ngoài (Event Horizon):** Lướt qua rìa để nhận **Speed Boost** cực lớn nhờ lực văng ly tâm. Các chuỗi **Photon** thường được bố trí để dẫn dụ người chơi thực hiện cú lướt này.
        *   **Lớp trong (Singularity):** Hút cực mạnh. Bay vào tâm sẽ bị giữ lại, làm reset hoàn toàn gia tốc về mức thấp nhất (Soft Fail state).

*   **Hệ thống Phản hồi Giác quan (Dynamic Sensory Feedback):**
    *   **Mục tiêu thiết kế:** Đồng bộ hóa chặt chẽ giữa thông số tốc độ (Game Logic) và cảm nhận thực tế (Game Feel), giúp người chơi nhận biết trạng thái nhân vật mà không cần nhìn UI.
    *   **Hiệu ứng Thị giác (Visual Adaptation - Dynamic FOV):**
        *   Khi tốc độ tăng, Camera không chỉ cuộn nhanh hơn mà trường nhìn (**FOV**) sẽ dãn ra tạo hiệu ứng mắt cá (**Fisheye Effect**), mô phỏng sự giãn nở không gian.
        *   Màu sắc môi trường chuyển dần sang quang phổ xanh/tím (**Blue Shift - Hiệu ứng Doppler**) để thể hiện vận tốc cao.
        *   Khi xảy ra va chạm (Penalty), màn hình sẽ rung lắc mạnh, màu sắc bị nhiễu (**Glitch**) hoặc chuyển đỏ quạch để báo hiệu sự mất đà.
    *   **Thiết kế Âm thanh (Adaptive Audio):** Nhạc nền (**BGM**) được chia thành các lớp (**Layers**) kích hoạt theo ngưỡng tốc độ:
        *   **Tốc độ thấp:** Chỉ có tiếng trống/bass nền.
        *   **Tốc độ cao:** Thêm các giai điệu synth dồn dập.
        *   **Tốc độ cực đại (Cận Light Speed):** Âm thanh trở nên méo mó (Distortion) và dồn dập, mô phỏng giới hạn vật lý.

*   **Cơ chế đặc biệt: Light Speed Break (Win Condition)**
    *   **Kích hoạt:** Khi người chơi lấp đầy thanh năng lượng và đạt ngưỡng **"Tốc độ ánh sáng" (Light Speed Threshold)**. Điều kiện này phụ thuộc chủ yếu vào lượng **Photon** thu thập được thay vì thời gian sống sót, cho phép Designer dùng vị trí của **Photon** để định hướng người chơi vào các bẫy rủi ro hoặc khu vực Hố Đen một cách tự nhiên.
    *   **Hiệu ứng:** Quả cầu bùng nổ ánh sáng cực đại (**Visual Bloom**), chuyển sang trạng thái bất tử. Đây là đỉnh điểm của hiệu ứng thị giác sau khi đã trải qua giai đoạn **Blue Shift**.
    *   **Cinematic Gameplay:** Kích hoạt một phân đoạn (sequence) dài **3 giây**, nhân vật tự động bay xuyên không gian với tốc độ siêu thanh, lao thẳng vào Cổng Không Gian (Warp Gate) ở phía xa để hoàn thành màn chơi/chuyển màn.

### Level 2: The Twin Paths of Light

Dưới đây là bản Game Design Document (GDD) hoàn chỉnh sau khi đã tích hợp và điều chỉnh các cơ chế mới để đảm bảo tính nhất quán và hấp dẫn cho màn chơi.

---

### 1. Mô tả tổng quan (Overview)
*   **Bối cảnh:** Màn chơi diễn ra tại hành tinh mới mang tên **"Crystalis"** (Hành tinh Pha Lê). Khác với không gian trống rỗng của Level 1, nơi này được bao phủ bởi các cấu trúc tinh thể khổng lồ, các khối nước lơ lửng và những bức tường kính trong suốt.
*   **Ý tưởng chủ đạo:** Người chơi (khối cầu ánh sáng) không còn bay tự do hoàn toàn mà phải tương tác với các bề mặt vật chất. Level này giới thiệu cơ chế "Lựa chọn quang học": Người chơi quyết định trở thành một tia sáng **Phản xạ** (nảy lại) hoặc **Khúc xạ** (xuyên qua) tại thời điểm va chạm.
*   **Cảm giác chơi:** Puzzle-Platformer kết hợp vật lý, yêu cầu tính toán góc độ và phản xạ nhanh nhạy.

### 2. Mục tiêu (Objectives)
*   **Mục tiêu chính:** Điều hướng luồng ánh sáng đi từ điểm khởi đầu qua mê cung các lăng kính để kích hoạt "Lõi Quang Phổ" (Spectral Core) ở cuối màn.
*   **Mục tiêu phụ:** Thu thập các "Hạt Photon" ẩn nằm bên trong các khối vật chất đặc biệt (chỉ có thể lấy được khi dùng cơ chế Khúc xạ).
*   **Kỹ năng cần đạt:** Người chơi phải thành thạo việc chuyển đổi trạng thái giữa "Bề mặt cứng" (Phản xạ) và "Bề mặt xuyên thấu" (Khúc xạ).

### 3. Cơ chế cốt lõi (Core Mechanics)

#### 3.1. Hành vi va chạm (Collision Behavior)
*   **Trạng thái Mặc định (Passive): Phản xạ (Reflection)**
    *   **Input:** Không bấm gì khi chạm bề mặt.
    *   **Hành vi:** Nhân vật nảy ra khỏi bề mặt.
    *   **Nguyên lý:** Góc phản xạ bằng góc tới.
    *   **Ứng dụng:** Dùng để đổi hướng di chuyển, nảy lên cao, hoặc tránh đi vào vùng nguy hiểm bên kia bức tường.

*   **Trạng thái Kích hoạt (Active): Khúc xạ (Refraction)**
    *   **Input:** Nhấn và giữ nút `Space` ngay trước hoặc trong khoảnh khắc va chạm. (có tác dụng trong vùng khoảng cách nhỏ trước bề mặt)
    *   **Hành vi:** Nhân vật xuyên qua bề mặt và đi vào bên trong vật thể.
    *   **Nguyên lý:** Đường bay bị bẻ cong (gãy khúc) tùy thuộc vào chỉ số khúc xạ của vật liệu.
    *   **Ứng dụng:** Dùng để đi xuyên tường, tiếp cận khu vực bí mật, hoặc thay đổi góc bay đầu ra khi thoát khỏi khối vật chất.

#### 3.2. Hệ thống hỗ trợ (Visual Aid)
*   **Tia dự đoán (Trajectory Line):** Khi người chơi bay gần đến bề mặt:
    *   Hiện tia nét đứt màu **TRẮNG** (hướng phản xạ dự kiến).
    *   Hiện tia nét đứt màu **XANH** (hướng khúc xạ dự kiến - mờ hơn, sẽ sáng lên khi bấm nút).

### 4. Thiết kế Môi trường & Vật liệu (Environment & Materials)
Level được thiết kế dựa trên các loại vật liệu có chỉ số khúc xạ khác nhau. Đặc biệt, hệ thống chướng ngại vật đã được cải tiến để tăng tính tương tác và tha thứ cho lỗi sai của người chơi.

*   **Thủy tinh (Glass):**
    *   *Độ lệch:* Nhẹ.
    *   *Tốc độ:* Giữ nguyên.
    *   *Mục đích:* Dùng cho các câu đố nhập môn, giúp người chơi làm quen việc xuyên tường.
*   **Nước (Water Orbs):**
    *   *Độ lệch:* Trung bình.
    *   *Tốc độ:* Giảm nhẹ (Slow motion).
    *   *Mục đích:* Cho phép người chơi có thêm thời gian điều chỉnh hướng bay tiếp theo khi đang ở trong khối nước.
*   **Kim cương/Pha lê (Diamond/Crystal):**
    *   *Độ lệch:* Rất lớn (Góc bẻ gắt).
    *   *Tốc độ:* Tăng tốc đột ngột khi thoát ra.
    *   *Mục đích:* Dùng cho các pha "bẻ lái" gấp hoặc tăng tốc để vượt qua chướng ngại vật xa.
*   **Gương đen (Dark Mirror - Chướng ngại vật):**
    *   *Đặc tính:* **Hấp thụ ánh sáng (Light Absorption)**.
    *   *Cơ chế:* Thay vì gây Game Over tức thì, bề mặt này áp dụng cơ chế **"Mất Năng Lượng" (Dimming)** để duy trì dòng chảy (flow) của màn chơi.
    *   *Hành vi:* Khi va chạm (dù phản xạ hay khúc xạ), nhân vật sẽ bị dính chặt vào bề mặt như nam châm và kích thước khối cầu ánh sáng bị thu nhỏ dần.
    *   *Tương tác thoát hiểm:* Người chơi phải bấm nháy nút `Space` liên tục để tạo ra sự bùng nổ năng lượng và thoát khỏi lực hút.
    *   *Hậu quả:* Sau khi thoát, nhân vật bị đẩy đi theo hướng ngẫu nhiên với kích thước nhỏ hơn (sẽ hồi phục dần theo thời gian). Game Over chỉ xảy ra khi người chơi không thoát kịp và ánh sáng tắt hẳn.

### 5. Cấu trúc màn chơi (Level Walkthrough)

*   **Phase 1: Tutorial (Làm quen)**
    *   Người chơi bay vào một hành lang hẹp toàn gương.
    *   Yêu cầu: Không làm gì cả, chỉ quan sát nhân vật tự nảy zic-zac (Phản xạ).
    *   Cuối hành lang là một bức tường kính chắn lối ra. Tutorial hiện nút bấm: "Giữ nút để xuyên qua".

*   **Phase 2: The Prism Puzzle (Câu đố Lăng kính)**
    *   Một căn phòng rộng với 3 khối pha lê hình tam giác xoay chậm.
    *   Người chơi phải chọn đúng góc bay tới và kích hoạt **Khúc xạ** để tia sáng bị bẻ cong đúng hướng về phía cửa ra.
    *   Nếu chọn sai (Phản xạ), người chơi sẽ bị nảy về điểm xuất phát.

*   **Phase 3: Dual Layer (Lớp kép)**
    *   Giới thiệu các bức tường kép: Lớp ngoài là Thủy tinh, lớp trong là Nước.
    *   Thử thách:
        1.  Va chạm lớp 1: Bấm nút (Khúc xạ vào trong).
        2.  Va chạm lớp 2 (bên trong): Thả nút (Phản xạ ở mặt trong lớp nước để di chuyển trong ống nước).
        3.  Đến cuối đường ống: Bấm nút lần nữa để Khúc xạ thoát ra ngoài.

*   **Phase 4: High Speed & Precision (Tốc độ & Chính xác)**
    *   Người chơi bay với tốc độ cao qua một dải thiên thạch pha lê xen kẽ các mảng Gương đen.
    *   Phải phản xạ liên tục (như chơi Pinball) và chỉ Khúc xạ đúng 1 khoảnh khắc quyết định để xuyên qua tâm của thiên thạch lớn nhất.
    *   Nếu lỡ va phải Gương đen, người chơi phải nhanh tay thực hiện thao tác giải thoát (mash button) để không bị nuốt chửng, tạo nên sự kịch tính ở giai đoạn cao trào.

### 6. Hình ảnh & Âm thanh (Visuals & Audio)

*   **Visual Effects (VFX):**
    *   **Khi Phản xạ:** Hiệu ứng lóe sáng (Lens flare), các hạt bụi ánh sáng văng ra tại điểm va chạm.
    *   **Khi Khúc xạ:** Nhân vật đổi màu nhẹ (ví dụ: từ Vàng sang Xanh Cyan), hiệu ứng gợn sóng (ripple) trên bề mặt vật chất khi xuyên qua.
    *   **Khi bị Hấp thụ (Gương đen):** Nhân vật bị bao trùm bởi làn khói đen, ánh sáng mờ dần (Dimming), hiệu ứng rung lắc nhẹ khi người chơi cố gắng thoát ra.
    *   **Môi trường:** Các khối vật chất phải trong suốt (translucent), có hiệu ứng tán sắc (caustics) đẹp mắt.

*   **Audio (SFX):**
    *   **Phản xạ:** Tiếng "Ping" thanh thoát, vang vọng (như tiếng gõ vào ly thủy tinh).
    *   **Khúc xạ:** Tiếng "Warp" hoặc "Vwoop" trầm, cảm giác như lặn xuống nước.
    *   **Hấp thụ:** Tiếng rít nhỏ (hizzing) và âm thanh ngột ngạt tăng dần.
    *   **Nhạc nền:** Electronic Ambient, sử dụng tiếng đàn Synth trong trẻo để hợp với chủ đề pha lê.

### Level 3: Symphony Orbit (Giao hưởng quỹ đạo)

Dưới đây là nội dung Game Design Document đã được cập nhật, hòa trộn giữa cơ chế cốt lõi và hệ thống Logic Kích thước/Trường độ mới để đảm bảo tính nhất quán về gameplay và trải nghiệm âm nhạc:

*   **Thể loại (Genre):** Rhythm Action kết hợp yếu tố **Physics & Timing**.
*   **Bối cảnh (Setting):** Không gian vũ trụ trừu tượng với các thiên thể/hành tinh phát quang (**Glowing Planets**).
*   **Góc nhìn (Camera):** **Dynamic Side-scrolling** (Cuộn ngang theo trục di chuyển) kết hợp camera bám theo quỹ đạo nhân vật.
*   **Nhân vật (Player Entity):** Một **Quả Cầu Sáng (Luminous Orb)** bay tự do, đại diện cho linh hồn của giai điệu.
*   **Game Flow & Mechanics:**
    *   **Khởi đầu:** Quả cầu sáng bay vào vùng không gian trung tâm, bị hút vào trường trọng lực (**Gravity Field**) của hành tinh đầu tiên và bắt đầu chuyển động xoay quanh nó.
    *   **Cơ chế cốt lõi (Core Mechanic):** Sử dụng kỹ thuật **Gravity Slingshot** với thao tác **One-button** (chạm đơn giản).
        *   **Trạng thái mặc định:** Quả cầu bị khóa chặt vào quỹ đạo hành tinh.
        *   **Thao tác:** Người chơi nhấn `Space` để "ngắt" lực hấp dẫn. Lúc này, quả cầu sẽ văng ra theo phương tiếp tuyến dựa trên quán tính (**Inertia**).
    *   **Đồng bộ Âm nhạc (Rhythm Sync):** Mỗi hành tinh đại diện cho một nốt nhạc (**Note**). Hành tinh mục tiêu tiếp theo sẽ phát sáng báo hiệu đúng theo nhịp (**Beat**) hoặc theo trình tự ghi nhớ (**Simon Says style**) để dẫn đường.
    *   **Logic Kích thước & Trường độ (Size & Duration Mechanics):** Để tăng chiều sâu gameplay và tạo sự logic chặt chẽ với âm nhạc, tốc độ xoay của quả cầu sẽ được quy định bởi kích thước hành tinh:
        *   **Hành tinh nhỏ:** Quả cầu xoay với tốc độ cao, đại diện cho các nốt có trường độ ngắn như móc đơn (**1/8 Note**) hoặc móc kép (**1/16 Note**). Yêu cầu người chơi phải có phản xạ nhanh.
        *   **Hành tinh lớn:** Quả cầu xoay chậm rãi, đại diện cho các nốt có trường độ dài như nốt trắng (**1/2 Note**) hoặc nốt tròn. Yêu cầu người chơi phải kiên nhẫn chờ đợi đúng nhịp.
        *   **Hiệu quả:** Thiết kế này tạo ra sự đa dạng trong nhịp độ (**Pacing**) của màn chơi, tránh cảm giác lặp lại nhàm chán và giúp người chơi cảm nhận trực quan cấu trúc bài nhạc thông qua tốc độ hình ảnh.
    *   **Mục tiêu (Objective):** Người chơi phải căn đúng thời điểm (**Timing**) để thả tay (dựa trên tốc độ xoay nhanh hay chậm của hành tinh hiện tại), sao cho véc-tơ chuyển động của quả cầu hướng về phía hành tinh đang phát sáng tiếp theo.
    *   **Hệ thống Combo:** Yêu cầu người chơi thực hiện chuỗi di chuyển liên tục: Quả cầu lướt từ Hành tinh A -> B -> C -> D không ngắt quãng. Sự liền mạch này sẽ tái tạo một bản nhạc hoàn chỉnh (**Seamless Music Track**).
    *   **Yêu cầu Kỹ thuật & Xử lý Vật lý (Tech Specs & Physics):**
        *   **Cơ chế Magnetic Rail (Đường Ray Từ Tính):** Để tối ưu hóa trải nghiệm và giảm thiểu lỗi, hệ thống vật lý sẽ áp dụng tính năng **Snap-to-Target**. Thay vì để quỹ đạo phụ thuộc hoàn toàn vào vật lý tự do (dễ gây lệch hướng dù thao tác đúng nhịp), game sẽ hỗ trợ nội suy (**Interpolate**) đường bay.
        *   **Logic xử lý:** Khi người chơi nhấn `Space` trong **khung thời gian vàng (Perfect Timing Window)**, quả cầu sẽ không bay theo quán tính thuần túy mà được điều hướng theo một đường cong hoàn hảo, hút thẳng vào tâm hành tinh tiếp theo.
        *   **UX/Balancing:** Thiết kế này thay thế cho việc chỉ mở rộng **Hitbox**, giúp loại bỏ cảm giác ức chế khi lệch vài pixel và đảm bảo game tập trung hoàn toàn vào **Rhythm (Nhịp điệu)** thay vì **Precision Aiming (Ngắm bắn chính xác)**. Đồng thời, giúp Dev tránh các lỗi va chạm hoặc tình trạng quả cầu bay vô định vào không gian.
*   **Kết thúc (Winning State):** Khi hoàn thành chuỗi combo trọn vẹn, tất cả các hành tinh sẽ cùng hòa âm và phát sáng rực rỡ. Hiệu ứng hình ảnh chuyển dần sang trắng xóa (**Fade to White**) -> End Game.

### Level 2: Refraction Valley (Thung lũng Khúc xạ)

*   **Thể loại:** Puzzle / Maze.
*   **Bối cảnh:** Hang động pha lê trong suốt, lấp lánh.
*   **Cơ chế riêng:**
    *   **Lăng kính (Prism):** Người chơi phải bắn tia sáng (giữ chuột) vào lăng kính.
    *   **Khúc xạ:** Tia sáng bị bẻ cong theo định luật Snell.
*   **Thử thách:** Tìm đường ra khỏi mê cung. Có những bức tường vô hình chỉ hiện ra khi ánh sáng đi qua lăng kính chiếu vào.
*   **Giải đố:** "Prism Gate" - Cổng bị khóa. Phải xoay các khối gương/lăng kính để dẫn tia sáng từ nguồn vào đúng tâm cửa.

### Level 3: Reflection Chamber (Ảo ảnh gương)

*   **Thể loại:** Observation / Puzzle.
*   **Bối cảnh:** Một căn phòng vô tận với hàng nghìn tấm gương.
*   **Quy tắc:**
    *   Xuất hiện hàng chục bản sao của nhân vật (Clones).
    *   Chỉ có 1 bản thể là thật (có phản xạ với môi trường hoặc phát ra âm thanh đúng).
    *   Các bản sao khác di chuyển ngược hướng hoặc trễ nhịp (Delay).
*   **Mục tiêu:** Tìm đường đến "Lõi Sự Thật" (True Core). Nếu chạm vào bản sao giả -> Màn hình vỡ (Glitch effect) -> Mất máu.

## 7. Thiết kế thế giới (Worldbuilding)

*   **Phong cách chủ đạo (Art Style):** Low-poly, Abstract, Surrealism.
*   **Hệ thống Màu sắc & Chất liệu (Level Progression):**
    *   **Lv0:** Đen (Deep Black), Xám (Slate Grey), Cam nhạt (Pale Orange).
        *   **Concept:** Bụi vũ trụ (Cosmic Dust) - Bề mặt nhám, sơ khai.
    *   **Lv1:** Cyan, Tím (Purple), Trong suốt (Transparency).
        *   **Concept:** Thủy tinh (Glass) - Bề mặt tinh thể, khúc xạ ánh sáng.
    *   **Lv2:** Bạc (Silver), Trắng (Pure White), Chrome.
        *   **Concept:** Gương (Mirror) - Bề mặt kim loại, phản xạ cao hoàn hảo.
*   **Kỹ thuật Ánh sáng (Lighting & VFX):** Sử dụng `UnrealBloomPass` để tạo hiệu ứng Glow mạnh, làm nổi bật tính chất phát quang của vật liệu.

## 8. Nhân vật & Đối tượng



### Nhân vật chính (The Lumina)

*   **Visual:** Một khối cầu phát sáng (SphereGeometry), có đuôi hạt (Particle System) kéo dài khi di chuyển.
*   **Thuộc tính:** Tốc độ, Độ sáng (Health), Bán kính Pulse.

### Kẻ thù / Chướng ngại vật

*   **Meteor:** Khối đá Low-poly, quay tự do. Physics body: Sphere.
*   **Shadow Comet:** Khối cầu gai màu đen, có shader hấp thụ ánh sáng xung quanh.
*   **Black Hole:** Vùng không gian làm méo lưới (Grid distortion), lực hút mạnh hướng tâm.

## 9. UI/UX

*   **Tiêu chí:** Minimalist, Diegetic (Giao diện hòa vào game).
*   **HUD:**
    *   Không có thanh máu truyền thống. Độ sáng của nhân vật chính là thanh máu.
    *   Không có minimap. Dùng ánh sáng dẫn đường.
*   **Menu:** Nút "Start Journey" đơn giản giữa màn hình đen.
*   **Debug (Dev mode):** Dùng `dat.GUI` để chỉnh Tốc độ, Gravity, Bloom Strength.

## 10. Tài nguyên (Assets)

*   **3D Models:**
    *   Player (Sphere).
    *   Rock_01, Rock_02 (Meteor).
    *   Crystal_Prism (Lvl 2).
    *   Planet_Mesh (Lvl 4).
*   **Audio:**
    *   Thư viện mẫu âm thanh cho Tone.js (Synth, Pluck, Pad).
*   **Shaders:**
    *   Glow Shader.
    *   Mirror/Reflection Shader (CubeCamera).
    *   Distortion Shader (Black hole).

## 11. Quy tắc thiết kế kỹ thuật

*   **Performance:**
    *   Giới hạn số lượng Particle.
    *   Sử dụng InstancedMesh cho các thiên thạch số lượng lớn.
    *   Tắt ShadowMap cho các vật thể quá xa.
*   **Physics:**
    *   Dùng Cannon.js cho va chạm cơ bản (Sphere vs Sphere, Sphere vs Box).
    *   Không cần physics chính xác tuyệt đối, ưu tiên cảm giác điều khiển mượt (Arcade feel).

## 12. Flow tổng thể

1.  **Load Assets:** Màn hình Loading.
2.  **Main Menu:** Tên game + Nút Start.
3.  **Intro Cutscene:** Text dẫn chuyện + Level 0.
4.  **Gameplay Loop:** Level 0 -> Transition -> Level 1 -> Transition -> Level 2.
5.  **Outro:** Visual Art + Credit.

## 13. Cấu trúc dữ liệu (JSON Example cho Level)

```json
{
  "level_id": 1,
  "name": "The Ascent",
  "gravity": { "x": 0, "y": -1, "z": 0 },
  "ambient_light": 0.5,
  "fog_density": 0.02,
  "obstacles": [
    { "type": "meteor", "position": { "x": 10, "y": 0, "z": -50 }, "scale": 2 },
    { "type": "blackhole", "position": { "x": 0, "y": -10, "z": -100 }, "pull_force": 50 }
  ],
  "music_scale": ["C4", "E4", "G4", "B4"]
}
```

## 14. Kịch bản / Storytelling

*   Dẫn chuyện tối giản qua các dòng text ngắn hiện ra và tan biến giữa không trung (Floating Text).
*   Ví dụ mở đầu: *"Trong hư vô, một ý niệm được thắp lên..."*
*   Ví dụ kết thúc: *"Và như thế, ánh sáng cất lời ca."*

## 15. Lộ trình phát triển (Roadmap)

1.  **Phase 1 (Core):** Setup Three.js + Cannon.js. Làm di chuyển nhân vật mượt mà.
2.  **Phase 2 (Visual):** Thêm Post-processing (Bloom), Particle Trail.
3.  **Phase 3 (Level 1):** Spawner thiên thạch, cơ chế mất máu.
4.  **Phase 4 (Level 2 & 3):** Cơ chế giải đố ánh sáng và gương.
5.  **Phase 5 (Audio & Polish):** Tích hợp Tone.js, đồng bộ âm thanh với va chạm.

## 16. Checklist để AI có thể code (Chia theo Module)

**Module 1: Setup & Player Controller**
- [ ] Khởi tạo Scene Three.js cơ bản (Camera, Renderer, Light).
- [ ] Tích hợp Cannon.js world.
- [ ] Tạo class `Player`: Mesh (Sphere), Body (Physics).
- [ ] Code logic di chuyển WASD + quán tính.
- [ ] Code logic Camera follow player (có độ trễ/smooth).

**Module 2: Environment & Obstacles**
- [ ] Tạo class `Meteor`: Mesh ngẫu nhiên, tự xoay, Body va chạm.
- [ ] Tạo hệ thống `Spawner`: Sinh thiên thạch ở phía trước camera và hủy khi ra sau camera (Object Pooling).
- [ ] Xử lý va chạm: Player chạm Meteor -> Gọi hàm `onDamage()`.

**Module 3: Visual Effects**
- [ ] Tích hợp `EffectComposer`, `UnrealBloomPass`.
- [ ] Tạo hiệu ứng `Pulse`: Shader lan tỏa vòng tròn từ tâm Player.
- [ ] Tạo Particle System cho đuôi nhân vật.

**Module 4: Audio System**
- [ ] Setup Tone.js Synth.
- [ ] Hàm `playNote()` kích hoạt khi va chạm.
- [ ] Hàm `updateBackgroundMusic()` dựa trên speed.

**Module 5: Game Logic / Manager**
- [ ] Quản lý biến `Score` / `Lumen`.
- [ ] State Machine: Menu -> Playing -> GameOver.
- [ ] Level Loader: Đọc config từ JSON để load vật thể.