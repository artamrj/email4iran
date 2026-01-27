-- Insert sample topics
INSERT INTO topics (slug, title, "shortDescription", "longDescription", "primaryRegion", tags, "metaPageTitle", "metaPageDescription")
VALUES
('climate-action', 'Climate Action Now', 'Advocate for urgent policies to combat climate change and promote sustainable practices.', 'The climate crisis demands immediate and decisive action. Rising global temperatures, extreme weather events, and sea-level rise threaten communities worldwide. By advocating for renewable energy, carbon reduction, and conservation, we can push for a sustainable future. This topic focuses on engaging with policymakers and industry leaders to implement effective climate solutions.', 'Global', ARRAY['Environment', 'Sustainability', 'Policy'], 'Climate Action Now - Advocate for Change', 'Join the movement for climate action. Learn how to advocate for policies that combat climate change and promote sustainability.'),
('ocean-conservation', 'Protect Our Oceans', 'Support initiatives to protect marine life, reduce plastic pollution, and preserve ocean ecosystems.', 'Our oceans are vital for life on Earth, providing food, regulating climate, and hosting incredible biodiversity. However, they face severe threats from pollution, overfishing, and climate change. This campaign aims to raise awareness and encourage action to protect marine ecosystems, reduce plastic waste, and support sustainable fishing practices. Your voice can help safeguard our blue planet.', 'Global', ARRAY['Environment', 'Oceans', 'Wildlife'], 'Protect Our Oceans - Marine Conservation', 'Discover how to protect marine life and reduce ocean pollution. Advocate for healthier ocean ecosystems.');

-- Insert sample categories and contacts (replace topic IDs with actual UUIDs from your 'topics' table after insertion)
-- For 'Climate Action Now' topic
WITH climate_topic AS (SELECT id FROM topics WHERE slug = 'climate-action')
INSERT INTO categories ("topicId", slug, name, description)
SELECT id, 'government-officials', 'Government Officials', 'Key government representatives responsible for environmental policy.' FROM climate_topic;

WITH climate_gov_cat AS (SELECT c.id FROM categories c JOIN topics t ON c."topicId" = t.id WHERE t.slug = 'climate-action' AND c.slug = 'government-officials')
INSERT INTO contacts ("categoryId", name, country, flag, title, email, languages)
SELECT id, 'Dr. Anya Sharma', 'India', '🇮🇳', 'Minister of Environment', 'anya.sharma@gov.in', ARRAY['en', 'hi'] FROM climate_gov_cat;

WITH climate_gov_cat AS (SELECT c.id FROM categories c JOIN topics t ON c."topicId" = t.id WHERE t.slug = 'climate-action' AND c.slug = 'government-officials')
INSERT INTO contacts ("categoryId", name, country, flag, title, email, languages)
SELECT id, 'Mr. David Chen', 'Canada', '🇨🇦', 'Director of Climate Policy', 'david.chen@gov.ca', ARRAY['en', 'fr'] FROM climate_gov_cat;

-- For 'Ocean Conservation' topic
WITH ocean_topic AS (SELECT id FROM topics WHERE slug = 'ocean-conservation')
INSERT INTO categories ("topicId", slug, name, description)
SELECT id, 'environmental-organizations', 'Environmental Organizations', 'Leading non-profits dedicated to marine conservation.' FROM ocean_topic;

WITH ocean_org_cat AS (SELECT c.id FROM categories c JOIN topics t ON c."topicId" = t.id WHERE t.slug = 'ocean-conservation' AND c.slug = 'environmental-organizations')
INSERT INTO contacts ("categoryId", name, country, flag, title, email, languages)
SELECT id, 'Ms. Elena Petrova', 'Spain', '🇪🇸', 'Head of Marine Programs, Ocean Alliance', 'elena.petrova@oceanalliance.org', ARRAY['en', 'es'] FROM ocean_org_cat;

WITH ocean_org_cat AS (SELECT c.id FROM categories c JOIN topics t ON c."topicId" = t.id WHERE t.slug = 'ocean-conservation' AND c.slug = 'environmental-organizations')
INSERT INTO contacts ("categoryId", name, country, flag, title, email, languages)
SELECT id, 'Dr. Kenji Tanaka', 'Japan', '🇯🇵', 'Research Director, Marine Life Institute', 'kenji.tanaka@marinelife.jp', ARRAY['en', 'ja'] FROM ocean_org_cat;

-- Insert sample email templates (replace contact IDs with actual UUIDs from your 'contacts' table after insertion)
-- For Dr. Anya Sharma (Climate Action)
WITH anya_contact AS (SELECT id FROM contacts WHERE name = 'Dr. Anya Sharma')
INSERT INTO email_templates ("contactId", language, subject, body)
SELECT id, 'en', 'Urgent Action on Climate Change Required', 'Dear Dr. Sharma,

My name is {{name}} and I am writing from {{city}}, {{country}} to urge you to prioritize climate action. The scientific consensus is clear: we need immediate and ambitious policies to transition to renewable energy and protect our planet.

I believe that strong leadership is essential to implement effective climate solutions. I encourage you to support initiatives that promote sustainable development and reduce greenhouse gas emissions.

Thank you for your time and consideration.

Sincerely,
{{name}}' FROM anya_contact;

WITH anya_contact AS (SELECT id FROM contacts WHERE name = 'Dr. Anya Sharma')
INSERT INTO email_templates ("contactId", language, subject, body)
SELECT id, 'hi', 'जलवायु परिवर्तन पर तत्काल कार्रवाई की आवश्यकता है', 'प्रिय डॉ. शर्मा,

मेरा नाम {{name}} है और मैं {{city}}, {{country}} से आपको जलवायु परिवर्तन पर तत्काल कार्रवाई करने का आग्रह करने के लिए लिख रहा हूँ। वैज्ञानिक सहमति स्पष्ट है: हमें नवीकरणीय ऊर्जा में परिवर्तन और अपने ग्रह की रक्षा के लिए तत्काल और महत्वाकांक्षी नीतियों की आवश्यकता है।

मेरा मानना है कि प्रभावी जलवायु समाधानों को लागू करने के लिए मजबूत नेतृत्व आवश्यक है। मैं आपसे सतत विकास को बढ़ावा देने और ग्रीनहाउस गैस उत्सर्जन को कम करने वाली पहलों का समर्थन करने का आग्रह करता हूँ।

आपके समय और विचार के लिए धन्यवाद।

भवदीय,
{{name}}' FROM anya_contact;

-- For Mr. David Chen (Climate Action)
WITH david_contact AS (SELECT id FROM contacts WHERE name = 'Mr. David Chen')
INSERT INTO email_templates ("contactId", language, subject, body)
SELECT id, 'en', 'Supporting Robust Climate Policies', 'Dear Mr. Chen,

I am {{name}} from {{city}}, {{country}}. I am writing to express my strong support for robust climate policies that will help Canada meet its environmental targets.

It is crucial that we invest in green technologies and protect our natural ecosystems. I urge you to continue advocating for policies that promote a sustainable and resilient future for all Canadians.

Thank you for your dedication to this critical issue.

Sincerely,
{{name}}' FROM david_contact;

WITH david_contact AS (SELECT id FROM contacts WHERE name = 'Mr. David Chen')
INSERT INTO email_templates ("contactId", language, subject, body)
SELECT id, 'fr', 'Soutien aux politiques climatiques robustes', 'Cher Monsieur Chen,

Je suis {{name}} de {{city}}, {{country}}. Je vous écris pour exprimer mon ferme soutien aux politiques climatiques robustes qui aideront le Canada à atteindre ses objectifs environnementaux.

Il est crucial que nous investissions dans les technologies vertes et protégions nos écosystèmes naturels. Je vous exhorte à continuer de plaider en faveur de politiques qui favorisent un avenir durable et résilient pour tous les Canadiens.

Merci pour votre dévouement à cette question critique.

Cordialement,
{{name}}' FROM david_contact;

-- For Ms. Elena Petrova (Ocean Conservation)
WITH elena_contact AS (SELECT id FROM contacts WHERE name = 'Ms. Elena Petrova')
INSERT INTO email_templates ("contactId", language, subject, body)
SELECT id, 'en', 'Action for Ocean Health', 'Dear Ms. Petrova,

My name is {{name}} and I am writing from {{city}}, {{country}} to commend your work at Ocean Alliance and to urge continued action for ocean health.

Plastic pollution and overfishing are devastating our marine environments. I support initiatives that promote sustainable practices and protect vulnerable marine species.

Thank you for your efforts in safeguarding our oceans.

Sincerely,
{{name}}' FROM elena_contact;

WITH elena_contact AS (SELECT id FROM contacts WHERE name = 'Ms. Elena Petrova')
INSERT INTO email_templates ("contactId", language, subject, body)
SELECT id, 'es', 'Acción por la Salud de los Océanos', 'Estimada Sra. Petrova,

Mi nombre es {{name}} y le escribo desde {{city}}, {{country}} para elogiar su trabajo en Ocean Alliance y para instar a la acción continua por la salud de los océanos.

La contaminación plástica y la sobrepesca están devastando nuestros entornos marinos. Apoyo las iniciativas que promueven prácticas sostenibles y protegen las especies marinas vulnerables.

Gracias por sus esfuerzos en la salvaguardia de nuestros océanos.

Atentamente,
{{name}}' FROM elena_contact;

-- For Dr. Kenji Tanaka (Ocean Conservation)
WITH kenji_contact AS (SELECT id FROM contacts WHERE name = 'Dr. Kenji Tanaka')
INSERT INTO email_templates ("contactId", language, subject, body)
SELECT id, 'en', 'Research and Conservation of Marine Life', 'Dear Dr. Tanaka,

I am {{name}} from {{city}}, {{country}}. I am deeply impressed by the research conducted at the Marine Life Institute and its contributions to ocean conservation.

Continued scientific research is vital for understanding and protecting our marine ecosystems. I encourage further efforts in this critical field.

Thank you for your invaluable work.

Sincerely,
{{name}}' FROM kenji_contact;

WITH kenji_contact AS (SELECT id FROM contacts WHERE name = 'Dr. Kenji Tanaka')
INSERT INTO email_templates ("contactId", language, subject, body)
SELECT id, 'ja', '海洋生物の研究と保全について', '田中博士様、

私は{{city}}、{{country}}の{{name}}です。海洋生物研究所で行われている研究とその海洋保全への貢献に深く感銘を受けております。

海洋生態系を理解し保護するためには、継続的な科学研究が不可欠です。この重要な分野におけるさらなるご尽力をお願い申し上げます。

貴重なご活動に感謝いたします。

敬具、
{{name}}' FROM kenji_contact;