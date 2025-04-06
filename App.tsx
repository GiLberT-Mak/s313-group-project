import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Button,
} from 'react-native';

const BusRoute = () => {
  const [isLoading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [clickedBus, setClickedBus] = useState(null);
  const [data, setData] = useState({ data: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('en');
  const [routeStop, setRouteStop] = useState([]);
  const [isLoadingRoute, setLoadingRoute] = useState(false);
  const [stopNames, setStopNames] = useState({});

  useEffect(() => {
    fetch('https://data.etabus.gov.hk/v1/transport/kmb/route/')
      .then((response) => response.json())
      .then((json) => setData(json))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, []);

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

  const ifBound = (bound) => {
    if (bound === "O") return "outbound";
    if (bound === "I") return "inbound";
    return "unknown";
  };

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

  const fetchAllStopNames = async (stops) => {
    const newStopNames = {};
    const promises = stops.map((stop) =>
      fetchStopName(stop.stop).then((name) => [stop.stop, name])
    );
    const results = await Promise.all(promises);
    results.forEach(([id, name]) => (newStopNames[id] = name));
    setStopNames(newStopNames);
  };

  const onClickHolder = (busNumber) => {
    setShowDetails(true);
    setClickedBus(busNumber);
  };

  const renderItemComponentEn = ({ item }) => (
    <View style={{ borderWidth: 1 }}>
      <View style={styles.busDetail}>
        <Text style={styles.tile}>{item.route}{'\n'}</Text>
        <Text style={styles.item} onPress={() => onClickHolder(item)}>
          To: {item.dest_en}{'\n'}
          From: {item.orig_en}{'\n'}
        </Text>
      </View>
    </View>
  );

  const renderItemComponentZh = ({ item }) => (
    <View style={{ borderWidth: 1 }}>
      <View style={styles.busDetail}>
        <Text style={styles.tile}>{item.route}{'\n'}</Text>
        <Text style={styles.item} onPress={() => onClickHolder(item)}>
          往: {item.dest_tc}{'\n'}
          由: {item.orig_tc}{'\n'}
        </Text>
      </View>
    </View>
  );

  const filteredData = searchQuery
    ? data.data.filter((item) => item.route === searchQuery)
    : data.data;

  const handleSearchText = (text) => {
    setSearchQuery(text.toUpperCase());
  };

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

  const renderStopItem = ({ item }) => (
    <View style={{ borderWidth: 1 }}>
      <View style={styles.busDetail}>
        <Text style={styles.tile}>{item.seq}{'\n'}</Text>
        <Text style={styles.item}>
          {language === 'en' ? 'Stop: ' : '站: '}{stopNames[item.stop] || 'Loading...'}{'\n'}
        </Text>
      </View>
    </View>
  );

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

  const showPage = () => {
    if (showDetails) {
      return detailPage();
    }
    return loadLanguage(language);
  };

  const loadLanguage = (lang) => {
    const renderItem = lang === 'en' ? renderItemComponentEn : renderItemComponentZh;
    const placeholder = lang === 'en' ? "Enter Bus number" : "輸入巴士號碼";
    const appTitle = lang === 'en' ? "BusRoute App" : "巴士APP";

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
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 42,
  },
  detailTitle: {
    fontSize: 24,
  },
  languageSwitcher: {
    alignItems: 'flex-end',
  },
  item: {
    fontSize: 18,
    padding: 5,
  },
  tile: {
    fontSize: 32,
    padding: 10,
  },
  busDetail: {
    flexDirection: "row",
    height: 79,
  },
  searchBar: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
});

export default BusRoute;