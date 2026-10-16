// Seed once so administrator edits and removals survive future deployments.
const cards = [
    {title: 'Find the Right Care', description: 'Explore care resources and connect with your care team to discuss the support that fits your needs.'},
    {title: 'Medication Conversations', description: 'Keep medication questions and instructions organized so you can discuss them with your healthcare professional.'},
    {title: 'Stay Connected', description: 'Keep your care information within reach and prepare questions for your next conversation with your care team.'},
    {title: 'Personalized Care Planning', description: 'Bring visit details, priorities, and care notes together to help your team coordinate support around you.'},
    {title: 'Everyday Care Support', description: 'Plan care visits and keep the people involved informed about the assistance needed for day-to-day wellbeing.'},
    {title: 'Organized Health Records', description: 'Keep important documents and visit information together, making it easier to find the details your care team needs.'}
  ];
export async function ensureHomeServiceSections(pool, log=console.info) {
  const connection=await pool.getConnection();let locked=false;
  try {
    const [locks]=await connection.query("SELECT GET_LOCK(CONCAT(LEFT(DATABASE(),40), ':home-services'),60) AS acquired");
    locked=Number(locks[0]?.acquired)===1;
    if(!locked)throw new Error('Could not acquire Home services migration lock.');
    await connection.query('CREATE TABLE IF NOT EXISTS AppMigration (migrationKey VARCHAR(100) PRIMARY KEY, appliedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
    await connection.beginTransaction();
    const key='home-service-sections-v1';
    const [applied]=await connection.query('SELECT migrationKey FROM AppMigration WHERE migrationKey = ?', [key]);
    if(applied.length){await connection.commit();return;}
    const [pages]=await connection.query("SELECT pageId FROM PageInfo WHERE LOWER(TRIM(name)) = 'home' ORDER BY pageId LIMIT 1");
    if(!pages.length){await connection.rollback();log('Home services migration: no Home page yet; will retry next startup.');return;}
    const pageId=pages[0].pageId;
    // Remove the two obsolete panels previously requested for removal.
    await connection.query("DELETE FROM PageSection WHERE pageId = ? AND LOWER(TRIM(REPLACE(sectionTitle, '!', ''))) IN ('fun night', 'joy night')",[pageId]);
    for(const [index,card] of cards.entries()) {
      const [existing]=await connection.query('SELECT sectionId FROM PageSection WHERE pageId = ? AND sectionTitle = ?', [pageId,card.title]);
      if(!existing.length)await connection.query('INSERT INTO PageSection (pageId,sectionTitle,sectionInfo,imageLocation) VALUES (?,?,?,?)',[pageId,card.title,card.description,'/designer-service-'+(index+1)+'.svg']);
    }
    await connection.query('INSERT INTO AppMigration (migrationKey) VALUES (?)',[key]);
    await connection.commit();log('Home services migration: six editable service panels initialized.');
  } catch(error){await connection.rollback();throw error;}
  finally {try{if(locked)await connection.query("SELECT RELEASE_LOCK(CONCAT(LEFT(DATABASE(),40), ':home-services'))");}finally{connection.release();}}
}
