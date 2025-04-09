import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Button,
  TouchableOpacity,
} from 'react-native';

// Main component for displaying bus routes and their stops
const BusRoute = () => {
  const [isLoading, setLoading] = useState(true);
  // Tracks initial route data loading
  const [showDetails, setShowDetails] = useState(false);
  // Toggles between main list and detail page
  const [clickedBus, setClickedBus] = useState(null);
  // Stores the selected bus route
  const [data, setData] = useState({ data: [] });
  // Stores all bus route data from API
  const [searchQuery, setSearchQuery] = useState('');
  // Stores user's search input
  const [language, setLanguage] = useState('en');
  // Manages language ('en' or 'zh')
  const [routeStop, setRouteStop] = useState([]);
  // Stores stops for the selected route
  const [isLoadingRoute, setLoadingRoute] = useState(false);
  // Tracks stop data loading
  const [stopNames, setStopNames] = useState({});
  // Maps stop IDs to their names

  // Fetch all bus routes on component mount
  useEffect(() => {
    fetch('https://data.etabus.gov.hk/v1/transport/kmb/route/')
      .then((response) => response.json())
      .then((json) => setData(json))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, []);

  // Fetch stops when a bus is clicked or language changes
  useEffect(() => {
    if (clickedBus) {
      setLoadingRoute(true);
      const routeStopsLink = `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${clickedBus.route}/${ifBound(clickedBus.bound)}/${clickedBus.service_type}`;
      fetch(routeStopsLink)
        .then((response) => response.json())
        .then((json) => {
          const stops = json.data || [];
          setRouteStop(stops);
          fetchAllStopNames(stops);
        })
        .catch((error) => console.error('Error fetching route stops:', error))
        .finally(() => setLoadingRoute(false));
    }
  }, [clickedBus, language]);

  // Converts bound code ("O" or "I") to "outbound" or "inbound"
  const ifBound = (bound) => {
    if (bound === "O") return "outbound";
    if (bound === "I") return "inbound";
    return "unknown";
  };

  // Fetches a stop's name by its ID
  const fetchStopName = async (stopId) => {
    try {
      const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop/${stopId}`);
      const json = await response.json();
      return language === 'en' ? json.data.name_en : json.data.name_tc;
    } catch (error) {
      console.error('Error fetching stop name:', error);
      return "Unknown Stop";
    }
  };

  // Fetches names for all stops in a route
  const fetchAllStopNames = async (stops) => {
    const newStopNames = {};
    const promises = stops.map((stop) =>
      fetchStopName(stop.stop).then((name) => [stop.stop, name])
    );
    const results = await Promise.all(promises);
    results.forEach(([id, name]) => (newStopNames[id] = name));
    setStopNames(newStopNames);
  };

  // Sets the clicked bus and shows the details page
  const onClickHolder = (busNumber) => {
    setShowDetails(true);
    setClickedBus(busNumber);
  };

  // Renders English route list items
  const renderItemComponentEn = ({ item }) => (
    <TouchableOpacity style={styles.routeBox} onPress={() => onClickHolder(item)}>
      <View style={styles.busDetail}>
        <Text style={styles.title}>{item.route}</Text>
        <Text style={styles.item}>
          <Text style={{ fontSize: 16 }}>To: </Text>
          <Text style={{ fontSize: 24 }}>{item.dest_en}{'\n'}</Text>
          <Text style={{ fontSize: 14 }}>From: {item.orig_en}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Renders Chinese route list items
  const renderItemComponentZh = ({ item }) => (
    <TouchableOpacity style={styles.routeBox} onPress={() => onClickHolder(item)}>
      <View style={styles.busDetail}>
        <Text style={styles.title}>{item.route}</Text>
        <Text style={styles.item}>
          <Text style={{ fontSize: 16 }}>往: </Text>
          <Text style={{ fontSize: 24 }}>{item.dest_tc}{'\n'}</Text>
          <Text style={{ fontSize: 14 }}>由: {item.orig_tc}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Filters routes based on search query
  const filteredData = searchQuery
    ? data.data.filter((item) => item.route.toUpperCase().includes(searchQuery))
    : data.data;

  // Updates search query, converting input to uppercase
  const handleSearchText = (text) => {
    setSearchQuery(text.toUpperCase());
  };

  // Renders language switcher UI
  const languageSwitcher = (lang) => {
    if (lang === "en") {
      return (
        <View style={styles.languageSwitcher}>
          <Text>切換語言</Text>
          <Button title="繁體中文" onPress={() => setLanguage('zh')} />
        </View>
      );
    } else if (lang === "zh") {
      return (
        <View style={styles.languageSwitcher}>
          <Text>Change Language</Text>
          <Button title="English" onPress={() => setLanguage('en')} />
        </View>
      );
    }
  };

  // Renders stop list items in detail page
  const renderStopItem = ({ item }) => (
    <View style={styles.stopBox}>
      <View style={styles.busDetailStop}>
        <Text style={styles.detailNumber}>{item.seq}.</Text>
        <Text style={styles.detailItem} numberOfLines={0}>
          {stopNames[item.stop] || 'Loading...'}
        </Text>
      </View>
    </View>
  );

  // Renders the detail page with stop list
  const detailPage = () => {
    return (
      <View style={styles.detailContainer}>
        <View style={styles.header}>
          <Text style={styles.detailTitle}>
            {language === 'en' ? `Route ${clickedBus?.route} Stops` : `路線 ${clickedBus?.route} 站點`}
          </Text>
          {languageSwitcher(language)}
        </View>
        <Button title={language === 'en' ? "Back" : "返回"} onPress={() => setShowDetails(false)} />
        {isLoadingRoute ? (
          <Text>{language === 'en' ? "Loading stops..." : "載入站點中..."}</Text>
        ) : (
          <FlatList
            data={routeStop}
            keyExtractor={(item) => item.stop}
            renderItem={renderStopItem}
          />
        )}
      </View>
    );
  };

  // Decides whether to show main list or detail page
  const showPage = () => {
    if (showDetails) {
      return detailPage();
    }
    return loadLanguage(language);
  };

  // Renders the main list page with language-specific content
  const loadLanguage = (lang) => {
    const renderItem = lang === 'en' ? renderItemComponentEn : renderItemComponentZh;
    const placeholder = lang === 'en' ? "Enter Bus number" : "輸入巴士號碼";
    const appTitle = lang === 'en' ? "KMB Route Searcher" : "九巴路線搜尋器";

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>{appTitle}</Text>
          {languageSwitcher(lang)}
        </View>
        <TextInput
          style={styles.searchBar}
          placeholder={placeholder}
          value={searchQuery}
          onChangeText={handleSearchText}
        />
        {isLoading ? (
          <Text>{lang === 'en' ? "Loading..." : "載入中..."}</Text>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item, index) => item.route + item.bound + index.toString()}
            renderItem={renderItem}
          />
        )}
      </View>
    );
  };

  return showPage();
};

// Styles for the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  detailContainer: {
    flex: 1,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // Reduced from 10
  },
  appTitle: {
    fontSize: 32,
  },
  detailTitle: {
    fontSize: 24,
  },
  languageSwitcher: {
    alignItems: 'flex-end',
  },
  item: {
    fontSize: 24, // Reduced base size for compactness
    paddingVertical: 4, // Reduced padding
    paddingHorizontal: 5,
    flexShrink: 1,
  },
  title: {
    fontSize: 32, // Slightly reduced from 32
    paddingVertical: 4, // Reduced from 10
    paddingHorizontal: 8, // Adjusted for compactness
    alignSelf: 'flex-start',
  },
  detailNumber: {
    fontSize: 32, // Slightly reduced from 32
    paddingVertical: 4, // Reduced from 10
    paddingHorizontal: 8,
  },
  busDetail: {
    flexDirection: 'row',
    paddingVertical: 4, // Reduced from 10
  },
  busDetailStop: {
    flexDirection: 'row',
    paddingVertical: 4, // Reduced from 10
  },
  searchBar: {
    height: 36, // Reduced from 40
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 8, // Reduced from 10
    paddingHorizontal: 8, // Reduced from 10
  },
  detailItem: {
    fontSize: 24, // Reduced from 26
    flexShrink: 1,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  routeBox: {
    borderWidth: 1,
    marginVertical: 1, // Reduced from 2
  },
  stopBox: {
    borderWidth: 1,
    marginVertical: 1, // Reduced from 2
  },
});

export default BusRoute;