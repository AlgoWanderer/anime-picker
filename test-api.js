// Test script to debug AniList API query
const ANILIST_API_URL = 'https://graphql.anilist.co';

// Test query
const testQuery = `
query ($startYear: Int, $endYear: Int) {
  Page(page: 1, perPage: 5) {
    pageInfo {
      total
    }
    media(
      type: ANIME,
      startDate_greater: $startYear,
      startDate_lesser: $endYear,
      sort: POPULARITY_DESC
    ) {
      id
      title {
        romaji
        english
      }
      startDate {
        year
      }
    }
  }
}
`;

async function testAPI() {
    console.log('Testing AniList API...');

    // Test with different date formats
    const tests = [
        { name: 'YYYYMMDD format', startYear: 19600101, endYear: 20251231 },
        { name: 'Just year', startYear: 1960, endYear: 2025 },
        { name: 'Year as string', startYear: '1960', endYear: '2025' }
    ];

    for (const test of tests) {
        console.log(`\n--- Testing: ${test.name} ---`);
        console.log(`Variables:`, test);

        try {
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: testQuery,
                    variables: {
                        startYear: test.startYear,
                        endYear: test.endYear
                    }
                })
            });

            const data = await response.json();

            if (data.errors) {
                console.error('❌ API Errors:', JSON.stringify(data.errors, null, 2));
            } else if (data.data) {
                console.log('✅ Success! Total results:', data.data.Page.pageInfo.total);
                console.log('Sample anime:', data.data.Page.media.slice(0, 2).map(a => ({
                    title: a.title.english || a.title.romaji,
                    year: a.startDate?.year
                })));
            }
        } catch (error) {
            console.error('❌ Fetch error:', error.message);
        }
    }
}

testAPI();
