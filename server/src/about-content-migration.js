const defaults = {
  "title": "Assail Health Care provides progressive, and affordable healthcare, accessible on mobile and online for everyone.",
  "information": "Assail Health Care is a distinguished healthcare provider specializing in personalized, high-quality care for individuals and families. With a steadfast focus on expert medical services, tailored support, and a seamless patient experience, we are dedicated to enhancing the well being of our clients and fostering a healthier community.\n\nOur team of compassionate and highly skilled professionals offers an extensive range of healthcare services catering to diverse medical needs. We believe in the power of collaboration and are committed to working closely with our clients, understanding their unique needs, and creating customized care plans to optimize their health outcomes.\n\nAt Assail Health Care, we continuously strive for innovation, embracing cutting-edge technology and advanced treatment methods to deliver the most effective care possible. Our state-of-the-art facilities provide a comfortable and welcoming environment where patients can feel at ease, knowing they are receiving the best possible care.\n\nWe are guided by our unwavering commitment to promoting healthier, happier lives for those we serve. Our mission is not only to address immediate health concerns but also to educate and empower our clients, encouraging them to adopt proactive measures that contribute to their long-term well-being.\n\nAs a trusted partner in health, Assail Health Care is dedicated to making a positive impact on the lives of our clients, one individual and one family at a time. Together, we are building a vibrant and thriving community where health and happiness are within everyone's reach.",
  "sections": [
    [
      "Customer comments",
      "Assail Health Care's personalized care and compassionate team have greatly improved our family's well-being. Their commitment to expert care sets them apart as an exceptional healthcare provider.\n\nAngela Smith",
      null
    ],
    [
      "Our Mission",
      "Assail Health Care is dedicated to empowering individuals and families by providing personalized, high-quality, and accessible health care services. We strive to enhance the wellbeing of our clients through expert care, innovative solutions, and a compassionate approach, fostering a healthier, happier community.",
      "/assail-calendar-doctor.jpg"
    ]
  ]
};
export async function ensureAboutContent(pool, log=console.info) {
  const connection=await pool.getConnection();let locked=false;
  try {
    const [locks]=await connection.query("SELECT GET_LOCK(CONCAT(LEFT(DATABASE(),40), ':about-content'),60) AS acquired");
    locked=Number(locks[0]?.acquired)===1;
    if(!locked)throw new Error('Could not acquire About content migration lock.');
    await connection.query('CREATE TABLE IF NOT EXISTS AppMigration (migrationKey VARCHAR(100) PRIMARY KEY, appliedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
    const [columns] = await connection.query("SELECT COLUMN_NAME AS name, CHARACTER_MAXIMUM_LENGTH AS capacity FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PageInfo'");
    for (const [name, capacity, type] of [['title',500,'VARCHAR(500)'], ['information',10000,'TEXT']]) {
      const column = columns.find(c => c.name === name);
      if (column && Number(column.capacity) < capacity) await connection.query('ALTER TABLE PageInfo MODIFY COLUMN ' + name + ' ' + type + ' NOT NULL');
    }
    await connection.beginTransaction();
    const key='about-content-v1';
    const [applied]=await connection.query('SELECT migrationKey FROM AppMigration WHERE migrationKey = ?', [key]);
    if(applied.length){await connection.commit();return;}
    const [pages] = await connection.query("SELECT pageId FROM PageInfo WHERE LOWER(TRIM(name)) IN ('about', 'about us') ORDER BY pageId LIMIT 1");
    if (!pages.length) {
      const [result] = await connection.query('INSERT INTO PageInfo (name,title,information,servicesIntro) VALUES (?,?,?,?)', ['About Us', defaults.title, defaults.information, '']);
      for (const section of defaults.sections) await connection.query('INSERT INTO PageSection (pageId,sectionTitle,sectionInfo,imageLocation) VALUES (?,?,?,?)', [result.insertId,...section]);
    }
    await connection.query('INSERT INTO AppMigration (migrationKey) VALUES (?)',[key]);
    await connection.commit();log('About content migration: resource directory initialized.');
  } catch(error){await connection.rollback();throw error;}
  finally {try{if(locked)await connection.query("SELECT RELEASE_LOCK(CONCAT(LEFT(DATABASE(),40), ':about-content'))");}finally{connection.release();}}
}
